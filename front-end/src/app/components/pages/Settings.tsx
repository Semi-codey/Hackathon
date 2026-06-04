import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Calendar, Smartphone, Target, Bell, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { api, exercises } from '../../lib/mockData';
import { toast } from 'sonner';
import { useAuth } from '../../providers/AuthProvider';
import type { ExerciseBaseline } from '../../types/workout';

type BaselineInput = {
  sets: string;
  reps: string;
  weight: string;
};

export function Settings() {
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [goal, setGoal] = useState('strength');
  const [notifications, setNotifications] = useState(true);
  const [baselineInputs, setBaselineInputs] = useState<Record<string, BaselineInput>>({});
  const { email, userId } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.getUserProfile();
        setGoal(profile.goal);
        setAutoSchedule(Boolean(profile.preferences.preferredTime));

        const baselines = await api.getExerciseBaselines();
        const baselineMap: Record<string, BaselineInput> = {};
        baselines.forEach((item) => {
          baselineMap[item.exerciseId] = {
            sets: item.sets ? String(item.sets) : '',
            reps: item.reps ? String(item.reps) : '',
            weight: item.weight ? String(item.weight) : '',
          };
        });
        setBaselineInputs(baselineMap);
      } catch (error) {
        console.error("loadProfile failed", error);
        toast.error('Kon profiel niet ophalen van SINAS');
      }
    };

    loadProfile();
  }, []);

  const [integrations, setIntegrations] = useState([
    { name: 'Strava', enabled: false, logo: '🏃' },
    { name: 'MyFitnessPal', enabled: false, logo: '🍎' },
    { name: 'Apple Health', enabled: true, logo: '' },
    { name: 'Garmin Connect', enabled: false, logo: '⌚' },
  ]);

  const handleGoogleCalendarSync = async () => {
    try {
      await api.syncWithGoogleCalendar();
      setGoogleCalendar(true);
      toast.success('Google Kalender gekoppeld!');
    } catch (error) {
      console.error("handleGoogleCalendarSync failed", error);
      toast.error('Google Kalender koppelen mislukt');
    }
  };

  const handleToggleIntegration = async (index: number) => {
    const updated = [...integrations];
    updated[index].enabled = !updated[index].enabled;
    setIntegrations(updated);

    if (updated[index].enabled) {
      try {
        await api.syncWithFitnessApps(updated[index].name);
        toast.success(`${updated[index].name} gekoppeld!`);
      } catch (error) {
        console.error("handleToggleIntegration failed", error);
        updated[index].enabled = false;
        setIntegrations(updated);
        toast.error(`${updated[index].name} koppelen mislukt`);
      }
    } else {
      toast.success(`${updated[index].name} ontkoppeld`);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const toPositiveNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
        return parsed;
      };

      const baselines: ExerciseBaseline[] = exercises.map((exercise) => {
        const input = baselineInputs[exercise.id] ?? { sets: '', reps: '', weight: '' };
        return {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          sets: toPositiveNumber(input.sets),
          reps: toPositiveNumber(input.reps),
          weight: toPositiveNumber(input.weight),
          updatedAt: new Date().toISOString(),
        };
      });

      await api.updateUserProfile({
        goal: goal as 'strength' | 'hypertrophy' | 'endurance' | 'crossfit' | 'powerlifting',
        preferences: {
          preferredTime: autoSchedule ? '18:00' : undefined,
        },
      });
      await api.updateExerciseBaselines(baselines);
      toast.success('Instellingen opgeslagen en gekoppeld aan account');
    } catch (error) {
      console.error("handleSaveSettings failed", error);
      toast.error('Opslaan mislukt (SINAS niet bereikbaar)');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Instellingen
        </h2>
        <p className="text-slate-400">
          Personaliseer je trainingsschema en integraties
        </p>
      </div>

      {/* Training goal */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Account koppeling</CardTitle>
          <CardDescription className="text-slate-400">
            Dit is je app-account dat gebruikt wordt voor alle data in SINAS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-white">E-mail</Label>
            <Input
              value={email}
              readOnly
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">App user id</Label>
            <Input
              value={userId}
              readOnly
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <p className="text-xs text-slate-400">
            Deze user id wordt automatisch gebruikt voor schema-, check-in- en voortgang requests.
          </p>
        </CardContent>
      </Card>

      {/* Training goal */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Trainingsdoel
          </CardTitle>
          <CardDescription className="text-slate-400">
            Het schema wordt geoptimaliseerd op basis van je doel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Primair doel</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="strength">Kracht (Strength)</SelectItem>
                <SelectItem value="hypertrophy">Spiergroei (Hypertrophy)</SelectItem>
                <SelectItem value="endurance">Uithoudingsvermogen</SelectItem>
                <SelectItem value="crossfit">CrossFit</SelectItem>
                <SelectItem value="powerlifting">Powerlifting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <p className="text-sm text-slate-300">
              <strong className="text-white">Wetenschappelijke basis:</strong> Het schema gebruikt evidence-based methoden zoals periodisering, progressive overload en optimale volume landmarks per spiergroep.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Startniveau per oefening</CardTitle>
          <CardDescription className="text-slate-400">
            Vul je huidige sets/reps/gewicht in, of laat leeg als beginner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {exercises.map((exercise) => {
            const values = baselineInputs[exercise.id] ?? { sets: '', reps: '', weight: '' };
            return (
              <div key={exercise.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{exercise.name}</p>
                  <p className="text-xs text-slate-400">{exercise.muscleGroup}</p>
                </div>
                <Input
                  inputMode="numeric"
                  value={values.sets}
                  onChange={(e) =>
                    setBaselineInputs((prev) => ({
                      ...prev,
                      [exercise.id]: {
                        ...values,
                        sets: e.target.value,
                      },
                    }))
                  }
                  placeholder="Sets"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  inputMode="numeric"
                  value={values.reps}
                  onChange={(e) =>
                    setBaselineInputs((prev) => ({
                      ...prev,
                      [exercise.id]: {
                        ...values,
                        reps: e.target.value,
                      },
                    }))
                  }
                  placeholder="Reps"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  inputMode="decimal"
                  value={values.weight}
                  onChange={(e) =>
                    setBaselineInputs((prev) => ({
                      ...prev,
                      [exercise.id]: {
                        ...values,
                        weight: e.target.value,
                      },
                    }))
                  }
                  placeholder="Gewicht (kg)"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Google Kalender integratie
          </CardTitle>
          <CardDescription className="text-slate-400">
            Automatisch trainingen plannen op basis van je agenda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-white">Koppel Google Kalender</Label>
              <p className="text-sm text-slate-400 mt-1">
                Het systeem kijkt naar vrije momenten in je agenda
              </p>
            </div>
            {googleCalendar ? (
              <Badge className="bg-green-500 text-white">
                Gekoppeld
              </Badge>
            ) : (
              <Button
                onClick={handleGoogleCalendarSync}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Koppelen
              </Button>
            )}
          </div>

          {googleCalendar && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <div className="flex-1">
                <Label className="text-white">Auto-schedule trainingen</Label>
                <p className="text-sm text-slate-400 mt-1">
                  Automatisch optimale tijden kiezen
                </p>
              </div>
              <Switch
                checked={autoSchedule}
                onCheckedChange={setAutoSchedule}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* App integrations */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            App integraties
          </CardTitle>
          <CardDescription className="text-slate-400">
            Synchroniseer met andere fitness apps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration, index) => (
            <div
              key={integration.name}
              className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                  {integration.logo}
                </div>
                <div>
                  <p className="text-white font-medium">{integration.name}</p>
                  <p className="text-xs text-slate-400">
                    {integration.enabled ? 'Gegevens worden gesynchroniseerd' : 'Niet gekoppeld'}
                  </p>
                </div>
              </div>
              <Switch
                checked={integration.enabled}
                onCheckedChange={() => handleToggleIntegration(index)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Meldingen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-white">Dagelijkse check-in reminder</Label>
              <p className="text-sm text-slate-400 mt-1">
                Ontvang een melding voor je ochtend check-in
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <div className="flex-1">
              <Label className="text-white">Training herinneringen</Label>
              <p className="text-sm text-slate-400 mt-1">
                30 min voor geplande trainingen
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSaveSettings}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12"
      >
        Instellingen opslaan
      </Button>
    </div>
  );
}
