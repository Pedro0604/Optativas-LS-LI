import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

export const DETAIL_POLL_INTERVAL_MS = 12_000;
export const LIST_POLL_INTERVAL_MS = 60_000;

export function visiblePollingInterval(interval: number) {
  return () =>
    typeof document === "undefined" || document.visibilityState === "visible" ? interval : false;
}

/** Pauses background RPC work and immediately refreshes active views when the tab returns. */
export function useRefreshOnVisibility(queryClient: QueryClient) {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        void queryClient.refetchQueries({ type: "active", stale: false });
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [queryClient]);
}
