import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

const passwordPolicyText = "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters (e.g., *, $, %, @).";

const friendlyAuthError = (message: string) => {
  if (message.toLowerCase().includes("password")) {
    return passwordPolicyText;
  }
  return message;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "missing" | "submitting">("checking");

  const hasMismatch = useMemo(() => password !== confirmPassword && confirmPassword.length > 0, [password, confirmPassword]);

  useEffect(() => {
    const establishSession = async () => {
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      try {
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          // Clean hash to avoid leaking tokens if user shares URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          setStatus("ready");
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      } catch (err) {
        console.error("Reset session error", err);
        setStatus("missing");
        toast.error("Session invalid or expired. Please request a new reset link.");
      }
    };

    void establishSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(passwordPolicyText);
      return;
    }
    if (hasMismatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Explicitly sign out everywhere so user must re-authenticate with the new password
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Password updated. Please sign in again.");
      navigate("/signin", { replace: true });
    } catch (err: any) {
      console.error("Update password error", err);
      toast.error(friendlyAuthError(err?.message || "Unable to update password. Please try again."));
      setStatus("ready");
    }
  };

  const renderContent = () => {
    if (status === "checking") {
      return <p className="text-sm text-muted-foreground">Validating your reset link…</p>;
    }

    if (status === "missing") {
      return (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Reset link is invalid or expired.</p>
          <Button onClick={() => navigate("/forgot-password")}>Request new link</Button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-1 my-1 h-8 w-8"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide passwords" : "Show passwords"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Repeat password</Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter the password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          {hasMismatch && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={status === "submitting"}>
          {status === "submitting" ? "Updating…" : "Change password"}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-glow">
            <LockKeyhole className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
            Set a new password
          </CardTitle>
          <CardDescription>
            For security, choose a unique password and keep it private.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
