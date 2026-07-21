"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { getQueryClient } from "@/lib/query/client";

export function Providers({ children }: { children: React.ReactNode }) {
  // Browser: a stable singleton (getQueryClient memoises it), so the cache and
  // its defaults/error seam are defined in exactly one place — see lib/query/client.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
