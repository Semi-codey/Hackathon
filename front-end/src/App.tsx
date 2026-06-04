import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { Toaster } from "./app/components/ui/sonner";
import { AuthProvider } from "./app/providers/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
