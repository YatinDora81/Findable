"use client";

import { useEffect } from "react";

const INTERVAL_MS = 5000;

const API_HEALTH = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/health`;

const WORKER_HEALTH = `${process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:4001"}/health`;

export function useKeepAlive() {
  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      if (cancelled) return;

      for (const url of [API_HEALTH, WORKER_HEALTH]) {
        fetch(url, { cache: "no-store", keepalive: true }).catch(() => {});
      }
    };

    ping();
    const timer = setInterval(ping, INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
}
