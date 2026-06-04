import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar as CalendarIcon, Plus, RefreshCw } from "lucide-react";
import type { WorkoutSession } from "../../types/workout";
import { api } from "../../lib/mockData";
import { sinasAgent } from "../../lib/sinasAgent";
import { toast } from "sonner";

const PLAN_CACHE_PREFIX = "gymtracker_plan_page_v1";

function getPlanCacheKey() {
  return `${PLAN_CACHE_PREFIX}:${sinasAgent.getActiveUserId()}`;
}

function loadPlanFromCache(): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getPlanCacheKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkoutSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlanToCache(sessions: WorkoutSession[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getPlanCacheKey(), JSON.stringify(sessions));
  } catch {
    // Ignore cache write failures
  }
}

export function WorkoutPlan() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(() => sinasAgent.getLastDebugInfo());

  const refreshDebugInfo = () => {
    setDebugInfo(sinasAgent.getLastDebugInfo());
  };

  useEffect(() => {
    const cached = loadPlanFromCache();
    if (cached.length > 0) {
      setSessions(cached);
      setLoading(false);
    }
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkoutSessions();
      if (data.length > 0) {
        setSessions(data);
        savePlanToCache(data);
      } else {
        const cached = loadPlanFromCache();
        if (cached.length > 0) {
          setSessions(cached);
        }
      }
    } catch (error) {
      console.error("loadSessions failed", error);
      const cached = loadPlanFromCache();
      if (cached.length > 0) {
        setSessions(cached);
        toast.info("Toon laatst opgeslagen schema");
      } else {
        toast.error("Kon schema niet ophalen van SINAS");
        setSessions((prev) => prev);
      }
    } finally {
      setLoading(false);
      refreshDebugInfo();
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      let goal: "strength" | "hypertrophy" | "endurance" | "crossfit" | "powerlifting" = "strength";
      try {
        const profile = await api.getUserProfile();
        goal = profile.goal;
      } catch {
        toast.info("Profiel niet beschikbaar, schema wordt gegenereerd met standaarddoel (strength)");
      }

      const data = await api.generateWorkoutPlan({ goal });
      setSessions(data);
      savePlanToCache(data);
      toast.success("Nieuw schema gegenereerd");
    } catch (error) {
      toast.error("Schema genereren mislukt");
      console.error("handleGeneratePlan failed", error);
    } finally {
      setLoading(false);
      refreshDebugInfo();
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = [
      "Zondag",
      "Maandag",
      "Dinsdag",
      "Woensdag",
      "Donderdag",
      "Vrijdag",
      "Zaterdag",
    ];
    return days[date.getDay()];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  };

  const handleSyncCalendar = async () => {
    // Mock Google Calendar sync
    await api.syncWithGoogleCalendar();
    alert("Gesynchroniseerd met Google Kalender! (Mock)");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Jouw trainingsschema
          </h2>
          <p className="text-slate-400">
            Op basis van wetenschappelijk onderzoek en jouw doelen
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={handleSyncCalendar}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Sync Google Kalender
        </Button>
        <Button
          onClick={() => setShowDebug((prev) => !prev)}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          {showDebug ? "Verberg SINAS debug" : "Toon SINAS debug"}
        </Button>
        <Button
          onClick={handleGeneratePlan}
          disabled={loading}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Genereren..." : "Genereer nieuw schema"}
        </Button>
      </div>

      {showDebug && (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">SINAS debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={refreshDebugInfo}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Refresh debug
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard
                    .writeText(JSON.stringify(debugInfo, null, 2))
                    .then(() => toast.success("Debug gekopieerd"))
                    .catch(() => toast.error("Kon debug niet kopiëren"));
                }}
                variant="outline"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Copy JSON
              </Button>
            </div>

            <pre className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-auto max-h-72">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="bg-blue-900/20 border-blue-700/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium mb-1">
                Automatisch schema optimalisatie
              </p>
              <p className="text-xs text-slate-300">
                Het systeem kijkt naar je beschikbaarheid in Google Kalender en
                plant trainingen op optimale tijden gebaseerd op herstelperiodes
                en slaapdata.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout sessions */}
      <div className="space-y-4">
        {!loading && sessions.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-slate-400 text-sm">
              Geen schema gevonden. Klik op "Genereer nieuw schema".
            </CardContent>
          </Card>
        )}

        {sessions.map((session) => {
          const isToday =
            session.date === new Date().toISOString().split("T")[0];
          const totalSets = session.exercises.reduce(
            (acc, ex) => acc + ex.sets.length,
            0,
          );

          return (
            <Card
              key={session.id}
              className={`${
                isToday
                  ? "bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-white">
                        {session.name}
                      </CardTitle>
                      {isToday && (
                        <Badge className="bg-blue-500 text-white">
                          Vandaag
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {getDayName(session.date)} • {formatDate(session.date)}
                    </p>
                  </div>
                  <Badge
                    variant={session.completed ? "default" : "outline"}
                    className={
                      session.completed
                        ? "bg-green-500 text-white"
                        : "border-slate-600 text-slate-400"
                    }
                  >
                    {session.completed ? "Voltooid" : "Gepland"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Exercise list */}
                <div className="space-y-2">
                  {session.exercises.map((ex) => {
                    const firstSet = ex.sets[0];
                    const weight = firstSet?.weight ?? 0;
                    const reps = firstSet?.reps ?? "-";

                    return (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">
                            {ex.exercise.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ex.sets.length} sets • {ex.restTime}s rust
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-medium">
                            {weight}kg
                          </p>
                          <p className="text-xs text-slate-400">
                            {reps} reps
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-2 text-sm text-slate-400">
                  <span>{session.exercises.length} oefeningen</span>
                  <span>•</span>
                  <span>{totalSets} sets totaal</span>
                  {session.duration && (
                    <>
                      <span>•</span>
                      <span>~{session.duration} min</span>
                    </>
                  )}
                </div>

                {/* Action */}
                <Link to={`/workout/${session.id}`} state={{ session }}>
                  <Button
                    className={`w-full ${
                      isToday
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        : "bg-slate-700 hover:bg-slate-600"
                    } text-white`}
                  >
                    {session.completed ? "Bekijk resultaten" : "Start training"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add custom workout */}
      <Button
        variant="outline"
        className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 h-16"
      >
        <Plus className="w-5 h-5 mr-2" />
        Voeg custom training toe
      </Button>
    </div>
  );
}
