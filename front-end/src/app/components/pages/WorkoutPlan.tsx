import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar as CalendarIcon, Plus, RefreshCw } from "lucide-react";
import type { WorkoutSession } from "../../types/workout";
import { api } from "../../lib/mockData";

export function WorkoutPlan() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await api.getWorkoutSessions();
    setSessions(data);
    setLoading(false);
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
          onClick={loadSessions}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Genereer nieuw schema
        </Button>
      </div>

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
                  {session.exercises.map((ex) => (
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
                          {ex.sets[0].weight}kg
                        </p>
                        <p className="text-xs text-slate-400">
                          {ex.sets[0].reps} reps
                        </p>
                      </div>
                    </div>
                  ))}
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
                <Link to={`/workout/${session.id}`}>
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
