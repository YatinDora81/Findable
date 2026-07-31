"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { useKeepAlive } from "../src/hooks/useKeepAlive";

function KeepAlive() {
  useKeepAlive();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        <KeepAlive />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "!bg-paper !text-ink !border !border-rule !rounded-[10px] !font-sans !text-[13px]",
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
