import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Award, Zap, Moon } from 'lucide-react';
import { Badge } from '../ui/badge';

export function Progress() {
  // Mock data voor charts
  const strengthData = [
    { week: 'Week 1', squat: 80, bench: 60, deadlift: 100 },
    { week: 'Week 2', squat: 85, bench: 62.5, deadlift: 105 },
    { week: 'Week 3', squat: 87.5, bench: 65, deadlift: 107.5 },
    { week: 'Week 4', squat: 90, bench: 67.5, deadlift: 110 },
    { week: 'Week 5', squat: 92.5, bench: 70, deadlift: 115 },
    { week: 'Week 6', squat: 95, bench: 72.5, deadlift: 117.5 },
  ];

  const volumeData = [
    { day: 'Ma', volume: 4500 },
    { day: 'Di', volume: 0 },
    { day: 'Wo', volume: 5200 },
    { day: 'Do', volume: 0 },
    { day: 'Vr', volume: 4800 },
    { day: 'Za', volume: 3200 },
    { day: 'Zo', volume: 0 },
  ];

  const sleepData = [
    { date: '1/6', hours: 7.5 },
    { date: '2/6', hours: 6.8 },
    { date: '3/6', hours: 7.2 },
    { date: '4/6', hours: 8.0 },
    { date: '5/6', hours: 7.0 },
    { date: '6/6', hours: 7.5 },
    { date: '7/6', hours: 6.5 },
  ];

  const achievements = [
    { title: 'Week Warrior', description: '7 dagen op rij getraind', icon: Award, color: 'text-yellow-400' },
    { title: 'Power Lifter', description: '100kg deadlift bereikt', icon: Zap, color: 'text-blue-400' },
    { title: 'Consistent', description: '30 dagen consecutive check-ins', icon: TrendingUp, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Jouw voortgang
        </h2>
        <p className="text-slate-400">
          Data-gedreven inzichten in je ontwikkeling
        </p>
      </div>

      {/* Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((achievement) => {
          const Icon = achievement.icon;
          return (
            <Card key={achievement.title} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${achievement.color}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{achievement.title}</p>
                    <p className="text-xs text-slate-400">{achievement.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="strength" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="strength" className="data-[state=active]:bg-slate-700">
            Kracht progressie
          </TabsTrigger>
          <TabsTrigger value="volume" className="data-[state=active]:bg-slate-700">
            Training volume
          </TabsTrigger>
          <TabsTrigger value="sleep" className="data-[state=active]:bg-slate-700">
            Slaap tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strength">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Kracht ontwikkeling</CardTitle>
              <CardDescription className="text-slate-400">
                1RM progression voor compound oefeningen (geschat o.b.v. working sets)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={strengthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="week" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="squat" stroke="#3b82f6" strokeWidth={2} name="Squat (kg)" />
                  <Line type="monotone" dataKey="bench" stroke="#8b5cf6" strokeWidth={2} name="Bench Press (kg)" />
                  <Line type="monotone" dataKey="deadlift" stroke="#10b981" strokeWidth={2} name="Deadlift (kg)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-4 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-400">Squat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-slate-400">Bench Press</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-slate-400">Deadlift</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Wekelijks volume</CardTitle>
              <CardDescription className="text-slate-400">
                Totaal gewicht × reps per dag (kg)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sleep">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-blue-400" />
                Slaap analyse
              </CardTitle>
              <CardDescription className="text-slate-400">
                Slaapuren per nacht - correlatie met trainingsperformance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[5, 9]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} name="Uren slaap" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">Inzicht:</strong> Je presteert 12% beter bij 7.5+ uur slaap. Probeer consistent te slapen voor optimale resultaten.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Personal records */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Persoonlijke records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { exercise: 'Squat', weight: 95, unit: 'kg' },
              { exercise: 'Bench Press', weight: 72.5, unit: 'kg' },
              { exercise: 'Deadlift', weight: 117.5, unit: 'kg' },
              { exercise: 'Pull-ups', weight: 15, unit: 'reps' },
            ].map((record) => (
              <div
                key={record.exercise}
                className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
              >
                <p className="text-sm text-slate-400 mb-1">{record.exercise}</p>
                <p className="text-2xl font-bold text-white">
                  {record.weight}
                  <span className="text-sm text-slate-400 ml-1">{record.unit}</span>
                </p>
                <Badge className="mt-2 bg-green-500/10 text-green-400 border-green-500/20">
                  +5% deze maand
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
