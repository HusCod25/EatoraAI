import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const forceReset = typeof window !== "undefined" &&
      window.localStorage.getItem("force_password_reset") === "true";

    if (!user) {
      navigate("/signin");
      return;
    }

    if (forceReset && location.pathname !== "/reset-password") {
      navigate("/reset-password");
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const forceReset = typeof window !== "undefined" &&
    window.localStorage.getItem("force_password_reset") === "true";

  if (!user) {
    return null;
  }

  if (forceReset && location.pathname !== "/reset-password") {
    return null;
  }

  return <>{children}</>;
};