import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Max image size: 5MB in base64 (roughly 6.67MB as base64 string)
const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

// Valid image MIME types
const VALID_IMAGE_PREFIXES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/gif;base64,',
  'data:image/webp;base64,',
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to verify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64 } = requestBody;

    // Validate image presence
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'No image provided or invalid format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum size is 5MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image format (must be data URL with valid image MIME type)
    const hasValidPrefix = VALID_IMAGE_PREFIXES.some(prefix => imageBase64.startsWith(prefix));
    
    // Also accept raw base64 (will be converted to data URL)
    const isRawBase64 = !imageBase64.startsWith('data:') && /^[A-Za-z0-9+/=]+$/.test(imageBase64.substring(0, 100));
    
    if (!hasValidPrefix && !isRawBase64) {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Supported formats: PNG, JPEG, GIF, WebP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a disaster damage assessment AI. Analyze images for disaster-related damage.

Tasks:
1. Determine whether visible damage is present.
2. Identify the most likely damage type.
3. Assess whether the image appears authentic or potentially misleading.
4. Estimate confidence as a probability, not a fact.

Damage types to consider:
- Flood
- Earthquake
- Fire
- Landslide
- Cyclone / Storm
- Infrastructure collapse
- Unknown / Unclear

Respond ONLY in valid JSON using this schema:
{
  "damageDetected": true | false,
  "damageType": "flood" | "earthquake" | "fire" | "landslide" | "cyclone" | "infrastructure" | "unknown",
  "confidence": 0.0 - 1.0,
  "authenticity": "likely authentic" | "unclear" | "potentially misleading",
  "reason": "brief explanation focusing on visual indicators"
}`;

    console.log('Sending image to AI for analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Analyze this image for disaster-related damage. Respond with JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI response:', content);

    // Parse JSON from response, handling potential markdown code blocks
    let analysisResult;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        damageDetected: false,
        damageType: 'unknown',
        confidence: 0,
        authenticity: 'unclear',
        reason: 'Unable to analyze image properly'
      };
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
