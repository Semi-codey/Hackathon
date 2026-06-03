import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Calendar, TrendingUp, Settings, Dumbbell } from "lucide-react";
import { DailyCheckInDialog } from "../dialogs/DailyCheckInDialog";
import { useState, useEffect } from "react";

export function RootLayout() {
  const location = useLocation();
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    // Check of gebruiker vandaag al heeft ingecheckt
    const lastCheckIn = localStorage.getItem("lastCheckIn");
    const today = new Date().toISOString().split("T")[0];

    if (lastCheckIn !== today) {
      // Wacht 1 seconde voor betere UX
      setTimeout(() => setShowCheckIn(true), 1000);
    }
  }, []);

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/plan", icon: Calendar, label: "Schema" },
    { path: "/progress", icon: TrendingUp, label: "Voortgang" },
    { path: "/settings", icon: Settings, label: "Instellingen" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">GymTracker Pro</h1>
                <p className="text-xs text-slate-400">
                  Wetenschappelijk workout schema
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "text-blue-400"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Daily check-in dialog */}
      <DailyCheckInDialog open={showCheckIn} onOpenChange={setShowCheckIn} />
    </div>
  );
}
