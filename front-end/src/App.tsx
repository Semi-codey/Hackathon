import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { Toaster } from "./app/components/ui/sonner";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
