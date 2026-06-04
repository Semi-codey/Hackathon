import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, Award, Zap, Moon } from "lucide-react";
import { Badge } from "../ui/badge";
import { api } from "../../lib/mockData";
import type { ProgressInsights } from "../../types/workout";
import { toast } from "sonner";

const emptyInsights: ProgressInsights = {
  strengthData: [],
  volumeData: [],
  sleepData: [],
  achievements: [],
  personalRecords: [],
};

export function Progress() {
  const [insights, setInsights] = useState<ProgressInsights>(emptyInsights);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const result = await api.getProgressInsights();
        setInsights(result);
      } catch (error) {
        console.error("loadInsights failed", error);
        toast.error("Kon voortgang niet laden van SINAS");
      }
    };
    loadInsights();
  }, []);

  const achievements = useMemo(
    () =>
      insights.achievements.slice(0, 3).map((item, index) => {
        const icon =
          item.color === "yellow" ? Award : item.color === "blue" ? Zap : TrendingUp;
        const color =
          item.color === "yellow"
            ? "text-yellow-400"
            : item.color === "blue"
              ? "text-blue-400"
              : "text-green-400";
        return {
          title: item.title || `Achievement ${index + 1}`,
          description: item.description || "Nieuwe milestone bereikt",
          icon,
          color,
        };
      }),
    [insights.achievements],
  );

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
        <TabsList className="bg-slate-900 border border-slate-700 p-1 h-auto gap-1">
          <TabsTrigger
            value="strength"
            className="text-slate-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:text-white"
          >
            Kracht progressie
          </TabsTrigger>
          <TabsTrigger
            value="volume"
            className="text-slate-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:text-white"
          >
            Training volume
          </TabsTrigger>
          <TabsTrigger
            value="sleep"
            className="text-slate-200 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:text-white"
          >
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
                <LineChart data={insights.strengthData}>
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
                <BarChart data={insights.volumeData}>
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
                <LineChart data={insights.sleepData}>
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
                  <strong className="text-white">Inzicht:</strong>{" "}
                  {insights.sleepInsight ||
                    "Je slaapdata wordt geanalyseerd voor gepersonaliseerde hersteladviezen."}
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
            {insights.personalRecords.slice(0, 8).map((record) => (
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
                  {record.changePct !== undefined
                    ? `${record.changePct >= 0 ? "+" : ""}${record.changePct}% deze periode`
                    : "PR bijgewerkt"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
