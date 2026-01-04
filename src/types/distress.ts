export type VerificationStatus = 
  | "Likely Genuine" 
  | "Needs Verification" 
  | "High Scam Probability"
  | "Pending";

export interface DistressPost {
  id: string;
  message: string;
  location: string;
  contact?: string | null;
  timestamp: Date;
  verification_status: VerificationStatus;
  confidence_score: number;
  ai_reason: string;
}

export interface SubmissionFormData {
  message: string;
  location: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
}

export interface AIVerificationResult {
  status: VerificationStatus;
  confidence: number;
  reason: string;
}
