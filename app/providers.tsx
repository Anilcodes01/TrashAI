
"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./components/Providers/NotificationProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster position="top-right" />
      <NotificationProvider />

      {children}
    </SessionProvider>
  );
}