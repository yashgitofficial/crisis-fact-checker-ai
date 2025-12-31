import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    // If remember me is not checked, we'll sign out on browser close
    // Supabase persists session by default, so we just log in normally
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If not remembering, store a flag to clear session on tab close
    if (!rememberMe && !error) {
      sessionStorage.setItem('session_temporary', 'true');
    } else {
      sessionStorage.removeItem('session_temporary');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signInAsGuest = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error };
  };

  const signOut = async () => {
    sessionStorage.removeItem('session_temporary');
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Handle session cleanup if "remember me" was not checked
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('session_temporary') === 'true') {
        // This won't actually work reliably due to browser restrictions
        // but we can clear on next load if tab was closed
        localStorage.setItem('should_clear_session', 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Check if we should clear session from previous visit
    if (localStorage.getItem('should_clear_session') === 'true') {
      localStorage.removeItem('should_clear_session');
      supabase.auth.signOut();
    }

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInAsGuest,
    signOut,
  };
}
