import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { ArrowLeft, Check, Timer, AlertCircle } from "lucide-react";
import type { WorkoutSession as WorkoutSessionType } from "../../types/workout";
import { api } from "../../lib/mockData";
import { toast } from "sonner";

export function WorkoutSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkoutSessionType | null>(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessions = await api.getWorkoutSessions();
        const found = sessions.find((s) => s.id === id);
        if (found) {
          setSession(found);
        }
      } catch (error) {
        console.error("loadSession failed", error);
        toast.error("Kon training niet laden van SINAS");
      }
    };

    loadSession();
  }, [id]);

  useEffect(() => {
    if (restTimer > 0) {
      const interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [restTimer]);

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Training niet gevonden</p>
      </div>
    );
  }

  if (!session.exercises.length) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{session.name}</h2>
            <p className="text-sm text-slate-400">Geen oefeningen gevonden</p>
          </div>
        </div>
      </div>
    );
  }

  const currentExercise = session.exercises[activeExerciseIndex];
  const completedSets = currentExercise.sets.filter((s) => s.completed).length;
  const totalSets = currentExercise.sets.length;
  const progress = (completedSets / totalSets) * 100;

  const handleSetComplete = async (
    setId: string,
    difficulty: 1 | 2 | 3 | 4 | 5,
  ) => {
    const setIndex = currentExercise.sets.findIndex((s) => s.id === setId);
    if (setIndex < 0) return;
    const updatedSets = [...currentExercise.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      completed: true,
      difficulty,
    };

    const updatedExercises = [...session.exercises];
    updatedExercises[activeExerciseIndex] = {
      ...currentExercise,
      sets: updatedSets,
    };

    setSession({
      ...session,
      exercises: updatedExercises,
    });

    try {
      await api.updateWorkoutSet(session.id, currentExercise.id, setId, {
        completed: true,
        difficulty,
      });
    } catch (error) {
      console.error("updateWorkoutSet failed", error);
      toast.error("Set kon niet worden opgeslagen in SINAS");
    }

    toast.success(`Set ${setIndex + 1} voltooid!`);

    // Start rest timer
    if (setIndex < currentExercise.sets.length - 1) {
      setRestTimer(currentExercise.restTime);
    }
  };

  const handleNextExercise = () => {
    if (activeExerciseIndex < session.exercises.length - 1) {
      setActiveExerciseIndex(activeExerciseIndex + 1);
      setRestTimer(0);
    } else {
      toast.success("Training voltooid! 🎉");
      navigate("/");
    }
  };

  const difficultyLabels = [
    { value: 1, label: "Zeer makkelijk", color: "bg-green-500" },
    { value: 2, label: "Makkelijk", color: "bg-lime-500" },
    { value: 3, label: "Gemiddeld", color: "bg-yellow-500" },
    { value: 4, label: "Zwaar", color: "bg-orange-500" },
    { value: 5, label: "Zeer zwaar", color: "bg-red-500" },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{session.name}</h2>
          <p className="text-sm text-slate-400">
            Oefening {activeExerciseIndex + 1} van {session.exercises.length}
          </p>
        </div>
      </div>

      {/* Exercise progress */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Voortgang oefening</span>
            <span className="text-sm text-white font-medium">
              {completedSets}/{totalSets} sets
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Rest timer */}
      {restTimer > 0 && (
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50">
          <CardContent className="p-6">
            <div className="text-center">
              <Timer className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300 mb-2">Rust</p>
              <p className="text-4xl font-bold text-white">{restTimer}s</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current exercise */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            {currentExercise.exercise.name}
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              {currentExercise.exercise.muscleGroup}
            </Badge>
            {currentExercise.exercise.equipment && (
              <Badge
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                {currentExercise.exercise.equipment}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentExercise.sets.map((set, index) => (
            <div key={set.id}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">
                    Set {index + 1}
                    {set.completed && (
                      <Check className="w-4 h-4 text-green-400 inline ml-2" />
                    )}
                  </p>
                  <p className="text-sm text-slate-400">
                    {set.weight}kg × {set.reps} reps
                  </p>
                </div>
                {set.completed && (
                  <Badge className={difficultyLabels[set.difficulty - 1].color}>
                    {difficultyLabels[set.difficulty - 1].label}
                  </Badge>
                )}
              </div>

              {!set.completed && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-2">
                    Hoe zwaar voelde deze set?
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {difficultyLabels.map((item) => (
                      <button
                        key={item.value}
                        onClick={() =>
                          handleSetComplete(
                            set.id,
                            item.value as 1 | 2 | 3 | 4 | 5,
                          )
                        }
                        className={`py-3 px-2 rounded-lg ${item.color} text-white text-xs font-medium hover:opacity-90 transition-opacity`}
                      >
                        {item.value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Makkelijk</span>
                    <span>Zwaar</span>
                  </div>
                </div>
              )}

              {index < currentExercise.sets.length - 1 && (
                <div className="border-t border-slate-700 my-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info tip */}
      <Card className="bg-blue-900/20 border-blue-700/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-1">
                Waarom difficulty rating?
              </p>
              <p className="text-xs text-slate-300">
                Door aan te geven hoe zwaar elke set voelde, kan het systeem
                automatisch je gewichten aanpassen voor optimale progressie
                volgens wetenschappelijke principes (progressive overload).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next exercise button */}
      {completedSets === totalSets && (
        <Button
          onClick={handleNextExercise}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12"
        >
          {activeExerciseIndex < session.exercises.length - 1
            ? "Volgende oefening"
            : "Training afronden"}
        </Button>
      )}
    </div>
  );
}
