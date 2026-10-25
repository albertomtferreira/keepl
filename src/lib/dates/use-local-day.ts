"use client";

import { useEffect, useState } from "react";
import { startOfDay } from "date-fns";

/** Refresh calendar-day UI at midnight and after returning to the app. */
export function useLocalDay() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(timer);
      const now = new Date();
      const current = startOfDay(now);
      setDay((previous) =>
        previous.getTime() === current.getTime() ? previous : current,
      );
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
