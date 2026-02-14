import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

const CheckEmail = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-12 h-12 bg-gradient-fresh rounded-xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-semibold text-white">
            Confirm your email
          </CardTitle>
          <CardDescription>
            We\'ve sent a confirmation link to your email address. Please click the link in that email to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once your email is confirmed, you can sign in and start generating meals.
          </p>
          <Button asChild className="w-full">
            <Link to="/signin">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckEmail;
