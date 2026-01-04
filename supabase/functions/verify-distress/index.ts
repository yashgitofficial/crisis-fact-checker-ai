import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, location, contact, latitude, longitude } = await req.json();
    
    if (!message || !location) {
      return new Response(
        JSON.stringify({ error: 'Message and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for background updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert post immediately with Pending status
    const { data: insertedPost, error: insertError } = await supabase
      .from('distress_posts')
      .insert({
        message,
        location,
        contact: contact || null,
        latitude: latitude || null,
        longitude: longitude || null,
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
