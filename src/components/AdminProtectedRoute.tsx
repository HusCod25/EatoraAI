import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route component that verifies user is authenticated AND has admin privileges
 * Server-side verification happens in database functions, but this adds a frontend check
 */
export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        if (!loading) {
          navigate("/signin");
        }
        return;
      }

      try {
        // Verify admin status from database (server-side check)
        const { data: subscription, error } = await supabase
          .from('user_subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single();

        if (error) {
          logger.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          const hasAdminAccess = subscription?.plan === 'admin';
          setIsAdmin(hasAdminAccess);
          
          if (!hasAdminAccess) {
            logger.warn('Non-admin user attempted to access admin route:', user.email);
            navigate("/");
          }
        }
      } catch (error) {
        logger.error('Error verifying admin access:', error);
        setIsAdmin(false);
        navigate("/");
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminAccess();
  }, [user, loading, navigate]);

  // Show loading while checking authentication and admin status
  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Not admin - will redirect, but show nothing while redirecting
  if (isAdmin === false) {
    return null;
  }

  // Admin verified - render children
  return <>{children}</>;
};

