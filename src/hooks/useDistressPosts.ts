import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DistressPost, SubmissionFormData, VerificationStatus } from '@/types/distress';
import { toast } from '@/hooks/use-toast';

export function useDistressPosts() {
  const [posts, setPosts] = useState<DistressPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('distress_posts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const mappedPosts: DistressPost[] = (data || []).map(post => ({
        id: post.id,
        message: post.message,
        location: post.location,
        contact: post.contact,
        timestamp: new Date(post.timestamp),
        verification_status: post.verification_status as VerificationStatus,
        confidence_score: Number(post.confidence_score),
        ai_reason: post.ai_reason,
      }));

      setPosts(mappedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('distress-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'distress_posts',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPost = payload.new as any;
            const mappedPost: DistressPost = {
              id: newPost.id,
              message: newPost.message,
              location: newPost.location,
              contact: newPost.contact,
              timestamp: new Date(newPost.timestamp),
              verification_status: newPost.verification_status as VerificationStatus,
              confidence_score: Number(newPost.confidence_score),
              ai_reason: newPost.ai_reason,
            };
            setPosts(prev => [mappedPost, ...prev.filter(p => p.id !== mappedPost.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPost = payload.new as any;
            setPosts(prev => prev.map(post => {
              if (post.id === updatedPost.id) {
                return {
                  id: updatedPost.id,
                  message: updatedPost.message,
                  location: updatedPost.location,
                  contact: updatedPost.contact,
                  timestamp: new Date(updatedPost.timestamp),
                  verification_status: updatedPost.verification_status as VerificationStatus,
                  confidence_score: Number(updatedPost.confidence_score),
                  ai_reason: updatedPost.ai_reason,
                };
              }
              return post;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setPosts(prev => prev.filter(post => post.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  // Add a new post
  const addPost = async (data: SubmissionFormData): Promise<DistressPost> => {
    setIsLoading(true);
    setError(null);

    try {
      // Insert the post with pending status
      const { data: insertedPost, error: insertError } = await supabase
        .from('distress_posts')
        .insert({
          message: data.message,
          location: data.location,
          contact: data.contact || null,
          verification_status: 'Pending',
          confidence_score: 0,
          ai_reason: 'Analyzing message...',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('Post inserted:', insertedPost.id);

      // Call AI verification edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-distress', {
        body: { message: data.message, location: data.location },
      });

      if (verifyError) {
        console.error('Verification error:', verifyError);
        throw verifyError;
      }

      console.log('AI verification result:', verifyResult);

      // Update the post with verification results
      const { data: updatedPost, error: updateError } = await supabase
        .from('distress_posts')
        .update({
          verification_status: verifyResult.status,
          confidence_score: verifyResult.confidence,
          ai_reason: verifyResult.reason,
        })
        .eq('id', insertedPost.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const result: DistressPost = {
        id: updatedPost.id,
        message: updatedPost.message,
        location: updatedPost.location,
        contact: updatedPost.contact,
        timestamp: new Date(updatedPost.timestamp),
        verification_status: updatedPost.verification_status as VerificationStatus,
        confidence_score: Number(updatedPost.confidence_score),
        ai_reason: updatedPost.ai_reason,
      };

      setIsLoading(false);
      return result;

    } catch (err) {
      console.error('Error adding post:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit message';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  };

  const clearError = () => setError(null);

  // Computed stats
  const genuineCount = posts.filter(p => p.verification_status === 'Likely Genuine').length;
  const warningCount = posts.filter(p => p.verification_status === 'Needs Verification').length;
  const dangerCount = posts.filter(p => p.verification_status === 'High Scam Probability').length;

  return {
    posts,
    isLoading,
    error,
    addPost,
    clearError,
    genuineCount,
    warningCount,
    dangerCount,
  };
}
