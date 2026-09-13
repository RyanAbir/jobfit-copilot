"use client";

import { useEffect } from "react";
import ErrorRetry from "@/components/ui/error-retry";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Avoid logging full error payloads; a short marker is enough for diagnostics.
    console.error("Dashboard section failed to render", error?.digest ?? "");
  }, [error]);

  return (
    <ErrorRetry
      title="This section could not load"
      description="Something went wrong while loading your dashboard data. This is usually temporary — please try again."
      reset={reset}
    />
  );
}
