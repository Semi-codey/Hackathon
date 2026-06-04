import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useAuth } from "../../providers/AuthProvider";

export function Auth() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    login,
    register,
    startGoogleLogin,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error("Vul een e-mailadres in");
      return;
    }

    if (!password.trim()) {
      toast.error("Vul een wachtwoord in");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password: password.trim() });
      toast.success("Ingelogd");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("login failed", error);
      toast.error(String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!registerEmail.trim()) {
      toast.error("Vul een e-mailadres in");
      return;
    }

    if (registerPassword.trim().length < 8) {
      toast.error("Gebruik minimaal 8 tekens voor je wachtwoord");
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast.error("Wachtwoorden komen niet overeen");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email: registerEmail.trim(),
        password: registerPassword,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      toast.success("Account aangemaakt en ingelogd");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("register failed", error);
      toast.error(String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      startGoogleLogin();
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-white">GymTracker Pro</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Log in met je app-account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-slate-900">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label className="text-white">E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Wachtwoord</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <Button
                onClick={handleLogin}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Login
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full border-slate-600 text-slate-100 hover:bg-slate-700"
              >
                Login with Google
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label className="text-white">Voornaam</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Achternaam</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">E-mail</Label>
                <Input
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Wachtwoord</Label>
                <Input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Herhaal wachtwoord</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <Button
                onClick={handleRegister}
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Account aanmaken
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
