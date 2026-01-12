import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the Sahayak Assistant - a focused chatbot EXCLUSIVELY for the Sahayak emergency distress signal platform.

**STRICT SCOPE - You ONLY answer questions about:**
1. **App Usage**: How to use Sahayak (submitting distress signals, GPS location, verification process, live feed, admin features)
2. **Emergency & Crisis Support**: Emergency contact numbers, what to do in emergencies, crisis guidance
3. **Platform FAQs**: Account issues, submission status, how verification works, privacy concerns

**IMPORTANT RESTRICTIONS:**
- You must REFUSE to answer ANY questions outside these topics
- For off-topic questions, politely respond: "I'm the Sahayak Assistant and can only help with app usage, emergency situations, and crisis-related questions. Is there something about Sahayak or an emergency I can help you with?"
- Do NOT engage in general conversation, trivia, coding help, math, jokes, stories, or any unrelated topics
- Stay focused and professional

**App Information:**
- Users submit distress signals with location, message, and optional contact info
- GPS location can be captured automatically or entered manually
- AI verifies submissions for authenticity
- Live feed shows recent distress signals
- Admins manage and verify submissions

**Emergency Guidance:**
- India: 112 (all emergencies), 100 (police), 101 (fire), 102/108 (ambulance)
- US: 911 | UK: 999 | EU: 112
- Always advise immediate danger situations to call local emergency services FIRST

Be concise, empathetic, and helpful within your scope.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!message) {
      throw new Error('Message is required');
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Calling Lovable AI with Gemini model...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('Successfully received AI response');

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in chatbot function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
