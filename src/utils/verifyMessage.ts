import { AIVerificationResult, VerificationStatus } from "@/types/distress";

// Disaster-related keywords that indicate genuine distress
const DISASTER_KEYWORDS = [
  'flood', 'earthquake', 'cyclone', 'hurricane', 'tornado', 'fire', 'tsunami',
  'landslide', 'storm', 'rescue', 'trapped', 'injured', 'help', 'emergency',
  'stranded', 'collapsed', 'drowning', 'evacuation', 'shelter', 'missing',
  'water', 'food', 'medical', 'children', 'elderly', 'family', 'house',
  'building', 'roof', 'floor', 'ambulance', 'hospital'
];

// Scam indicators and manipulation patterns
const SCAM_INDICATORS = [
  'send money', 'bank account', 'bitcoin', 'crypto', 'western union',
  'gift card', 'wire transfer', 'urgent payment', 'lottery', 'won',
  'prince', 'inheritance', 'click here', 'verify account', 'password',
  'social security', 'credit card', 'claim now', 'limited time',
  'act now', 'guaranteed', 'risk free', 'secret', 'miracle'
];

// Emotional manipulation phrases
const MANIPULATION_PHRASES = [
  'dying', 'last chance', 'only you can help', 'god will bless',
  'pray for us', 'children will die', 'blood on your hands',
  'ignore if you have no heart', 'share or else', 'forward this'
];

// Function to analyze message content
function analyzeContent(message: string, location: string): AIVerificationResult {
  const lowerMessage = message.toLowerCase();
  const lowerLocation = location.toLowerCase();
  const combinedText = `${lowerMessage} ${lowerLocation}`;
  
  let score = 0.5; // Start neutral
  const reasons: string[] = [];
  
  // Check for disaster keywords (positive indicator)
  const disasterMatches = DISASTER_KEYWORDS.filter(keyword => 
    combinedText.includes(keyword)
  );
  
  if (disasterMatches.length > 0) {
    score += Math.min(disasterMatches.length * 0.08, 0.3);
    reasons.push(`Contains ${disasterMatches.length} disaster-related terms`);
  }
  
  // Check for specific location details (positive indicator)
  const hasSpecificLocation = /\d+|street|road|avenue|block|floor|building|near|opposite|behind/i.test(location);
  if (hasSpecificLocation) {
    score += 0.1;
    reasons.push("Location contains specific details");
  }
  
  // Check for number of people mentioned (positive indicator)
  const peoplePattern = /\d+\s*(people|persons|family|members|children|kids|adults)/i;
  if (peoplePattern.test(message)) {
    score += 0.1;
    reasons.push("Specifies number of people affected");
  }
  
  // Check for scam indicators (negative indicator)
  const scamMatches = SCAM_INDICATORS.filter(indicator => 
    combinedText.includes(indicator)
  );
  
  if (scamMatches.length > 0) {
    score -= Math.min(scamMatches.length * 0.15, 0.4);
    reasons.push(`Contains ${scamMatches.length} potential scam indicator(s)`);
  }
  
  // Check for emotional manipulation (negative indicator)
  const manipulationMatches = MANIPULATION_PHRASES.filter(phrase => 
    combinedText.includes(phrase)
  );
  
  if (manipulationMatches.length > 0) {
    score -= Math.min(manipulationMatches.length * 0.12, 0.3);
    reasons.push("Contains emotional manipulation language");
  }
  
  // Check message length (too short is suspicious)
  if (message.length < 30) {
    score -= 0.15;
    reasons.push("Message is too brief for actionable response");
  } else if (message.length > 100 && message.length < 500) {
    score += 0.05;
    reasons.push("Message provides adequate detail");
  }
  
  // Check for contact information format
  const hasValidContact = /\+?\d{10,}|[\w.-]+@[\w.-]+\.\w+/.test(combinedText);
  if (hasValidContact) {
    score += 0.08;
    reasons.push("Contains verifiable contact information");
  }
  
  // Check for ALL CAPS (potential spam)
  const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
  if (capsRatio > 0.5 && message.length > 20) {
    score -= 0.1;
    reasons.push("Excessive use of capital letters");
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    score -= 0.08;
    reasons.push("Excessive punctuation detected");
  }
  
  // Clamp score between 0 and 1
  score = Math.max(0.05, Math.min(0.98, score));
  
  // Determine status based on score
  let status: VerificationStatus;
  if (score >= 0.65) {
    status = "Likely Genuine";
  } else if (score >= 0.35) {
    status = "Needs Verification";
  } else {
    status = "High Scam Probability";
  }
  
  // Build reason string
  const reasonString = reasons.length > 0 
    ? reasons.join(". ") + "."
    : "Standard analysis completed without notable indicators.";
  
  return {
    status,
    confidence: score,
    reason: reasonString
  };
}

// Simulated AI verification with delay to mimic API call
export async function verifyDistressMessage(
  message: string, 
  location: string
): Promise<AIVerificationResult> {
  // Simulate network delay (300-800ms)
  await new Promise(resolve => 
    setTimeout(resolve, 300 + Math.random() * 500)
  );
  
  return analyzeContent(message, location);
}

// Alternative: Real AI integration placeholder
// This function can be swapped for actual Gemini/OpenAI integration
export async function verifyWithAI(
  message: string,
  location: string,
  apiEndpoint?: string
): Promise<AIVerificationResult> {
  const prompt = `You are a disaster-response verification assistant.
Analyze the following distress message and estimate how likely it is to be genuine.

Message: ${message}
Location: ${location}

Evaluate based on:
1. Specific details
2. Disaster relevance
3. Emotional manipulation
4. Scam indicators

Respond ONLY in valid JSON:
{
  "status": "Likely Genuine | Needs Verification | High Scam Probability",
  "confidence": number between 0 and 1,
  "reason": "short explanation"
}`;

  // If no API endpoint, use local analysis
  if (!apiEndpoint) {
    return verifyDistressMessage(message, location);
  }

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    return data as AIVerificationResult;
  } catch (error) {
    console.error('AI verification failed, falling back to local analysis:', error);
    return verifyDistressMessage(message, location);
  }
}
