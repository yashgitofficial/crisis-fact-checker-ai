export type VerificationStatus = 
  | "Likely Genuine" 
  | "Needs Verification" 
  | "High Scam Probability"
  | "Pending";

export interface DistressPost {
  id: string;
  message: string;
  location: string;
  contact?: string;
  timestamp: Date;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  aiReason: string;
}

export interface SubmissionFormData {
  message: string;
  location: string;
  contact?: string;
}

export interface AIVerificationResult {
  status: VerificationStatus;
  confidence: number;
  reason: string;
}
