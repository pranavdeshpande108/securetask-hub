import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'user' | 'admin') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, session) => {
        // If refresh fails (corrupt/expired refresh token), force a clean sign-out
        if (event === 'TOKEN_REFRESH_FAILED') {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          toast({
            title: 'Session expired',
            description: 'Please sign in again.',
            variant: 'destructive',
          });

          // Defer supabase call to avoid auth callback deadlocks
          setTimeout(() => {
            supabase.auth.signOut();
          }, 0);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // If a stored session exists, verify it can be refreshed; otherwise clear it.
      if (session) {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          toast({
            title: 'Session expired',
            description: 'Please sign in again.',
            variant: 'destructive',
          });
        }
      }
    })();

    return () => subscription.unsubscribe();
  }, [toast]);

  const signUp = async (email: string, password: string, fullName: string, role: 'user' | 'admin') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Insert role for the new user
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role,
          });

        if (roleError) {
          console.error('Error setting user role:', roleError);
        }
      }

      // Try to automatically sign in the newly created user so they can access protected routes immediately
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // Most commonly this will fail when email confirmation is required
          toast({
            title: "Registration successful!",
            description: "Please check your email to confirm your account before signing in.",
          });
        } else {
          toast({
            title: "Registration successful!",
            description: "Welcome! You have been signed in.",
          });
        }
      } catch (err) {
        console.error('Auto sign-in error:', err);
        toast({
          title: "Registration successful!",
          description: "Please check your email to confirm your account.",
        });
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "An error occurred",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "An error occurred",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      // On success, the browser will redirect.
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Google sign-in failed',
        description: err.message,
        variant: 'destructive',
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
