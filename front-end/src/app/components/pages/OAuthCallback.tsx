import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  exchangeCodeForTokens,
  finishPendingSyncIfAny,
} from "@/app/lib/googleCalendar";
import { toast } from "sonner";

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");

        if (!code) {
          toast.error("Geen autorisatiecode ontvangen");
          navigate("/");
          return;
        }

        await exchangeCodeForTokens(code);
        toast.success("Google autorisatie succesvol");

        // Finish any pending session sync if present
        const res = await finishPendingSyncIfAny();
        if (res?.performed && res.result?.success) {
          toast.success("Workouts gesynchroniseerd met Google Calendar");
        } else if (res?.performed && !res.result?.success) {
          toast.error("Synchronisatie voltooid, maar met fouten");
        }

        navigate("/");
      } catch (err) {
        console.error(err);
        toast.error("Google autorisatie mislukt");
        navigate("/");
      }
    })();
  }, [navigate]);

  return (
    <div className="text-center py-16">
      <p className="text-slate-400">
        Bezig met voltooien van Google autorisatie…
      </p>
    </div>
  );
}
