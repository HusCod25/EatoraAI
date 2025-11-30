import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/authUtils";
import { logger } from "@/lib/logger";
import { errorTracker } from "@/lib/errorTracking";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  initialized: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session first
        logger.debug('🔍 AUTH DEBUG: Getting initial session...');
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        logger.debug('🔍 AUTH DEBUG: Initial session result:', {
          session: initialSession,
          user: initialSession?.user?.email,
          error: sessionError
        });
        
        if (sessionError) {
          logger.warn('⚠️ AUTH DEBUG: Session error on init:', sessionError);
          // Clear potentially corrupted auth state
          cleanupAuthState();
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (mounted) {
          logger.debug('🔍 AUTH DEBUG: Setting initial user:', initialSession?.user?.email);
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          // Set user context in error tracker
          if (initialSession?.user) {
            errorTracker.setUser(initialSession.user.id, initialSession.user.email || null);
          }
          
          setLoading(false);
          setInitialized(true);
        }

        // Set up auth state listener AFTER initial session check
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            logger.debug('🔔 AUTH DEBUG: Auth state change event:', {
              event,
              userEmail: session?.user?.email,
              sessionId: session?.access_token?.substring(0, 20) + '...'
            });
            
            // Handle different auth events
            switch (event) {
              case 'SIGNED_IN':
                logger.debug('✅ AUTH DEBUG: User signed in:', session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
                
                // Set user context in error tracker
                if (session?.user) {
                  errorTracker.setUser(session.user.id, session.user.email || null);
                }
                break;
                
              case 'SIGNED_OUT':
                logger.debug('🚪 AUTH DEBUG: User signed out');
                // Clean up any stale auth data
                cleanupAuthState();
                setSession(null);
                setUser(null);
                
                // Clear user context in error tracker
                errorTracker.setUser(null, null);
                break;
                
              case 'TOKEN_REFRESHED':
                logger.debug('🔄 AUTH DEBUG: Token refreshed for:', session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
                break;
                
              case 'USER_UPDATED':
                logger.debug('👤 AUTH DEBUG: User updated:', session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
                break;
                
              default:
                logger.debug('❓ AUTH DEBUG: Unknown auth event:', event, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);
            }
            
            setLoading(false);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error('💥 AUTH DEBUG: Auth initialization error:', error);
        cleanupAuthState();
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    const cleanup = initializeAuth();

    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};