import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Calendar, TrendingUp, Flame, Target, Clock, Moon } from "lucide-react";
import { api } from "../../lib/mockData";
import type { WorkoutSession } from "../../types/workout";
import { toast } from "sonner";

export function Dashboard() {
  const [todayWorkout, setTodayWorkout] = useState<WorkoutSession | null>(null);
  const [weekProgress, setWeekProgress] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sessions = await api.getWorkoutSessions();
        const today = new Date().toISOString().split("T")[0];
        const todaySession = sessions.find((s) => s.date === today);
        setTodayWorkout(todaySession || null);

        // Bereken week progress (mock)
        setWeekProgress(60);
      } catch (error) {
        console.error("Dashboard loadData failed", error);
        toast.error("Kon trainingsdata niet laden van SINAS");
      }
    };

    loadData();
  }, []);

  const stats = [
    {
      label: "Week streak",
      value: "12",
      icon: Flame,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Doelen bereikt",
      value: "85%",
      icon: Target,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Gemiddelde slaap",
      value: "7.2u",
      icon: Moon,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Welkom */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Welkom terug! 💪</h2>
        <p className="text-slate-400">Laten we vandaag weer sterker worden</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Week progress */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Week voortgang
          </CardTitle>
          <CardDescription className="text-slate-400">
            3 van 5 trainingen voltooid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={weekProgress} className="h-3" />
          <p className="text-sm text-slate-400 mt-2">
            {weekProgress}% voltooid
          </p>
        </CardContent>
      </Card>

      {/* Vandaag's workout */}
      {todayWorkout ? (
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Training van vandaag
                </CardTitle>
                <CardDescription className="text-slate-300 mt-1">
                  {todayWorkout.name}
                </CardDescription>
              </div>
              <Badge className="bg-blue-500 text-white">Gepland</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {todayWorkout.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  {(() => {
                    const firstSet = ex.sets[0];
                    const reps = firstSet?.reps ?? "-";
                    const weight = firstSet?.weight ?? 0;
                    return (
                      <>
                  <div>
                    <p className="text-white font-medium">{ex.exercise.name}</p>
                    <p className="text-sm text-slate-400">
                      {ex.sets.length} sets × {reps} reps
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    {weight}kg
                  </Badge>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
            <Link to={`/workout/${todayWorkout.id}`} state={{ session: todayWorkout }}>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                Start Training
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">
              Geen training gepland voor vandaag
            </p>
            <Link to="/plan">
              <Button
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Bekijk schema
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/progress">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-white font-medium">Voortgang</p>
              <p className="text-xs text-slate-400 mt-1">Bekijk statistieken</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-medium">Doelen</p>
              <p className="text-xs text-slate-400 mt-1">Pas aan</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
