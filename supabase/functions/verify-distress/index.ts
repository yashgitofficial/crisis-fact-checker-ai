import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const postSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
  location: z.string().min(3, "Location must be at least 3 characters").max(500, "Location must be less than 500 characters"),
  contact: z.string().max(200, "Contact must be less than 200 characters").optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    // Parse and validate input
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = postSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, location, contact, latitude, longitude } = validationResult.data;

    // Create Supabase client with service role for background updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert post immediately with Pending status and user ownership
    const { data: insertedPost, error: insertError } = await supabase
      .from('distress_posts')
      .insert({
        message,
        location,
        contact: contact || null,
        latitude: latitude || null,
        longitude: longitude || null,
        user_id: userId,
        verification_status: 'Pending',
        confidence_score: 0,
        ai_reason: 'Analyzing message...',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Post inserted:', insertedPost.id);

    // Define verification function
    const runVerification = async () => {
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          console.error('LOVABLE_API_KEY is not configured');
          return;
        }

        const prompt = `You are a disaster-response verification assistant.
Analyze the following distress message and estimate how likely it is to be genuine.

Message: ${message}
Location: ${location}

Evaluate based on:
1. Specific details (addresses, number of people, floor numbers, etc.)
2. Disaster relevance (flood, earthquake, fire, etc. keywords)
3. Emotional manipulation (excessive urgency, guilt-tripping)
4. Scam indicators (requests for money, suspicious links, vague details)

Respond ONLY in valid JSON with this exact structure:
{
  "status": "Likely Genuine" or "Needs Verification" or "High Scam Probability",
  "confidence": a number between 0 and 1,
  "reason": "brief explanation of your analysis"
}`;

        console.log('Calling AI for verification...');

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a disaster verification AI. Always respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          console.error('AI gateway error:', response.status);
          return;
        }

        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content;
        
        console.log('AI response:', aiContent);

        // Parse the JSON response from AI
        let result;
        try {
          let cleanContent = aiContent;
          if (cleanContent.includes('```json')) {
            cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (cleanContent.includes('```')) {
            cleanContent = cleanContent.replace(/```\n?/g, '');
          }
          result = JSON.parse(cleanContent.trim());
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          result = {
            status: 'Needs Verification',
            confidence: 0.5,
            reason: 'Unable to analyze message automatically. Manual verification recommended.'
          };
        }

        // Validate and normalize the response
        const validStatuses = ['Likely Genuine', 'Needs Verification', 'High Scam Probability'];
        if (!validStatuses.includes(result.status)) {
          result.status = 'Needs Verification';
        }
        result.confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0.5));

        console.log('Verification result:', result);

        // Update post with verification results (using service role bypasses RLS)
        const { error: updateError } = await supabase
          .from('distress_posts')
          .update({
            verification_status: result.status,
            confidence_score: result.confidence,
            ai_reason: result.reason,
          })
          .eq('id', insertedPost.id);

        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          console.log('Post updated with verification:', insertedPost.id);
        }
      } catch (bgError) {
        console.error('Background verification error:', bgError);
      }
    };

    // Try to use EdgeRuntime.waitUntil for background processing, otherwise run inline
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(runVerification());
    } else {
      // Fallback: run without awaiting (fire and forget)
      runVerification();
    }

    // Return immediately with the inserted post
    return new Response(
      JSON.stringify({
        success: true,
        post: insertedPost,
        message: 'Post submitted. AI verification in progress.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-distress function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
