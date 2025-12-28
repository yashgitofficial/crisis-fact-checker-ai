import { create } from 'zustand';
import { DistressPost, SubmissionFormData, VerificationStatus } from '@/types/distress';
import { verifyDistressMessage } from '@/utils/verifyMessage';

interface DistressStore {
  posts: DistressPost[];
  isLoading: boolean;
  error: string | null;
  addPost: (data: SubmissionFormData) => Promise<DistressPost>;
  clearError: () => void;
}

// Generate unique ID
const generateId = () => 
  `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Sample initial data for demo
const initialPosts: DistressPost[] = [
  {
    id: generateId(),
    message: "Family of 4 trapped on 2nd floor due to rising flood water. Building at 45 River Street, near old market. Water level at 4 feet and rising. Children aged 3 and 7. Need immediate rescue boat.",
    location: "45 River Street, Riverside District, Near Old Market",
    contact: "+1-555-0123",
    timestamp: new Date(Date.now() - 1800000), // 30 min ago
    verificationStatus: "Likely Genuine",
    confidenceScore: 0.87,
    aiReason: "Contains 5 disaster-related terms. Location contains specific details. Specifies number of people affected. Contains verifiable contact information."
  },
  {
    id: generateId(),
    message: "URGENT!!! Send money to help victims!!! Western Union only!!! Share this message or children will die!!!",
    location: "Unknown area",
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    verificationStatus: "High Scam Probability",
    confidenceScore: 0.12,
    aiReason: "Contains 2 potential scam indicator(s). Contains emotional manipulation language. Message is too brief for actionable response. Excessive use of capital letters. Excessive punctuation detected."
  },
  {
    id: generateId(),
    message: "Roof collapsed in apartment building after earthquake tremors. 3 elderly residents need medical attention. Building is Block C, Sunrise Apartments, 5th main road.",
    location: "Block C, Sunrise Apartments, 5th Main Road, Ward 12",
    contact: "ramesh.kumar@email.com",
    timestamp: new Date(Date.now() - 7200000), // 2 hours ago
    verificationStatus: "Likely Genuine",
    confidenceScore: 0.82,
    aiReason: "Contains 4 disaster-related terms. Location contains specific details. Specifies number of people affected. Message provides adequate detail."
  },
  {
    id: generateId(),
    message: "Some flooding in my area. Anyone else affected?",
    location: "Downtown",
    timestamp: new Date(Date.now() - 10800000), // 3 hours ago
    verificationStatus: "Needs Verification",
    confidenceScore: 0.48,
    aiReason: "Contains 1 disaster-related terms. Message is too brief for actionable response."
  }
];

export const useDistressStore = create<DistressStore>((set, get) => ({
  posts: initialPosts,
  isLoading: false,
  error: null,

  addPost: async (data: SubmissionFormData) => {
    set({ isLoading: true, error: null });

    try {
      // Create pending post
      const pendingPost: DistressPost = {
        id: generateId(),
        message: data.message,
        location: data.location,
        contact: data.contact,
        timestamp: new Date(),
        verificationStatus: "Pending",
        confidenceScore: 0,
        aiReason: "Analyzing message..."
      };

      // Add pending post immediately for real-time feel
      set(state => ({
        posts: [pendingPost, ...state.posts]
      }));

      // Run AI verification
      const result = await verifyDistressMessage(data.message, data.location);

      // Update post with verification results
      const verifiedPost: DistressPost = {
        ...pendingPost,
        verificationStatus: result.status,
        confidenceScore: result.confidence,
        aiReason: result.reason
      };

      // Replace pending post with verified one
      set(state => ({
        posts: state.posts.map(p => 
          p.id === pendingPost.id ? verifiedPost : p
        ),
        isLoading: false
      }));

      return verifiedPost;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit distress message';
      
      set({ 
        isLoading: false, 
        error: errorMessage 
      });
      
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
