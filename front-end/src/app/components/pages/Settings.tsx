import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Calendar, Smartphone, Target, Bell, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { api } from '../../lib/mockData';
import { toast } from 'sonner';

export function Settings() {
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [goal, setGoal] = useState('strength');
  const [notifications, setNotifications] = useState(true);

  const [integrations, setIntegrations] = useState([
    { name: 'Strava', enabled: false, logo: '🏃' },
    { name: 'MyFitnessPal', enabled: false, logo: '🍎' },
    { name: 'Apple Health', enabled: true, logo: '' },
    { name: 'Garmin Connect', enabled: false, logo: '⌚' },
  ]);

  const handleGoogleCalendarSync = async () => {
    await api.syncWithGoogleCalendar();
    setGoogleCalendar(true);
    toast.success('Google Kalender gekoppeld!');
  };

  const handleToggleIntegration = async (index: number) => {
    const updated = [...integrations];
    updated[index].enabled = !updated[index].enabled;
    setIntegrations(updated);

    if (updated[index].enabled) {
      await api.syncWithFitnessApps(updated[index].name);
      toast.success(`${updated[index].name} gekoppeld!`);
    } else {
      toast.success(`${updated[index].name} ontkoppeld`);
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
      <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12">
        Instellingen opslaan
      </Button>
    </div>
  );
}
