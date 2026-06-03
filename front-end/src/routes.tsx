import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./app/components/layouts/RootLayout";
import { Dashboard } from "./app/components/pages/Dashboard";
import { WorkoutPlan } from "./app/components/pages/WorkoutPlan";
import { WorkoutSession } from "./app/components/pages/WorkoutSession";
import { Progress } from "./app/components/pages/Progress";
import { Settings } from "./app/components/pages/Settings";
import OAuthCallback from "./app/components/pages/OAuthCallback";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "plan", Component: WorkoutPlan },
      { path: "workout/:id", Component: WorkoutSession },
      { path: "oauth2callback", Component: OAuthCallback },
      { path: "progress", Component: Progress },
      { path: "settings", Component: Settings },
    ],
  },
]);
