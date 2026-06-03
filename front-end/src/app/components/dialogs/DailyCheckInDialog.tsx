import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Moon, Activity, Smile } from 'lucide-react';
import { api } from '../../lib/mockData';
import { toast } from 'sonner';

interface DailyCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyCheckInDialog({ open, onOpenChange }: DailyCheckInDialogProps) {
  const [sleepHours, setSleepHours] = useState([7]);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [steps, setSteps] = useState('');
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);

  const handleSubmit = async () => {
    const today = new Date().toISOString().split('T')[0];

    await api.submitDailyCheckIn({
      date: today,
      sleep: {
        date: today,
        hours: sleepHours[0],
        quality: sleepQuality,
      },
      steps: steps ? parseInt(steps) : undefined,
      mood,
    });

    localStorage.setItem('lastCheckIn', today);
    toast.success('Check-in opgeslagen!');
    onOpenChange(false);
  };

  const qualityLabels = ['Slecht', 'Matig', 'Goed', 'Zeer goed', 'Uitstekend'];
  const moodEmojis = ['😫', '😕', '😐', '🙂', '😄'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Goedemorgen! 🌅</DialogTitle>
          <DialogDescription className="text-slate-400">
            Hoe heb je geslapen en hoe voel je je vandaag?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Slaap uren */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <Label className="text-white">Uren geslapen: {sleepHours[0]}u</Label>
            </div>
            <Slider
              value={sleepHours}
              onValueChange={setSleepHours}
              min={3}
              max={12}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Slaap kwaliteit */}
          <div className="space-y-3">
            <Label className="text-white">Slaapkwaliteit: {qualityLabels[sleepQuality - 1]}</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setSleepQuality(value as 1 | 2 | 3 | 4 | 5)}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                    sleepQuality === value
                      ? 'bg-blue-500 border-blue-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Stappen */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <Label htmlFor="steps" className="text-white">Stappen (optioneel)</Label>
            </div>
            <input
              id="steps"
              type="number"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="Bijv. 8000"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stemming */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-yellow-400" />
              <Label className="text-white">Hoe voel je je?</Label>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setMood(value as 1 | 2 | 3 | 4 | 5)}
                  className={`flex-1 py-3 px-3 rounded-lg border transition-all text-2xl ${
                    mood === value
                      ? 'bg-blue-500 border-blue-400 scale-110'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {moodEmojis[value - 1]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Later
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
