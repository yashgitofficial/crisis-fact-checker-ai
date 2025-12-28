import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { message, location } = await req.json();
    
    if (!message || !location) {
      return new Response(
        JSON.stringify({ error: 'Message and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying distress message:', { message: message.substring(0, 50), location });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', aiContent);

    // Parse the JSON response from AI
    let result;
    try {
      // Clean up the response in case it has markdown code blocks
      let cleanContent = aiContent;
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }
      result = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response if parsing fails
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

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-distress function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'Needs Verification',
        confidence: 0.5,
        reason: 'Verification system temporarily unavailable.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
