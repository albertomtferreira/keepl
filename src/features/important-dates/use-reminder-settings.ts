"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  defaultReminderSettings,
  reminderSettingsSchema,
  type ReminderSettings,
} from "./reminder-settings";
const eventName = "keepl-reminder-settings";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}
export function useReminderSettings() {
  const { user } = useAuth();
  const key = `keepl:reminders:v1:${user?.uid ?? "anonymous"}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  let settings = defaultReminderSettings;
  try {
    settings = reminderSettingsSchema.parse(JSON.parse(raw ?? "null"));
  } catch {
    /* Default for absent or malformed device settings. */
  }
  function save(value: ReminderSettings) {
    localStorage.setItem(
      key,
      JSON.stringify(reminderSettingsSchema.parse(value)),
    );
    window.dispatchEvent(new Event(eventName));
  }
  return { settings, save };
}
