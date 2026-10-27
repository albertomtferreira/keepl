"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { reminderCategories, type ReminderSettings } from "./reminder-settings";
import { useReminderSettings } from "./use-reminder-settings";
export function ReminderSettingsPanel() {
  const { t } = useI18n();
  const { settings, save } = useReminderSettings();
  const [error, setError] = useState(false);
  function update(
    kind: (typeof reminderCategories)[number],
    index: number,
    patch: Partial<ReminderSettings["birthday"][number]>,
  ) {
    try {
      save({
        ...settings,
        [kind]: settings[kind].map((rule, i) =>
          i === index ? { ...rule, ...patch } : rule,
        ),
      } as ReminderSettings);
      setError(false);
    } catch {
      setError(true);
    }
  }
  return (
    <section className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{t("reminderSettings", "title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("reminderSettings", "detail")}
      </p>
      <p className="text-sm" suppressHydrationWarning>
        {t("reminderSettings", "timezone", {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
      </p>
      {reminderCategories.map((kind) => (
        <fieldset key={kind} className="space-y-3 rounded-lg border p-3">
          <legend className="px-1 font-medium">
            {t("importantDates", kind)}
          </legend>
          {settings[kind].map((rule, index) => (
            <fieldset key={index} className="flex flex-wrap items-center gap-3">
              <legend className="mb-2 text-sm">
                {t("reminderSettings", index === 0 ? "first" : "second")}
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) =>
                    update(kind, index, { enabled: e.target.checked })
                  }
                />
                {t("reminderSettings", "enabled")}
              </label>
              <label>
                <span className="sr-only">
                  {t("importantDates", "reminder")}
                </span>
                <select
                  className="h-10 rounded-lg border px-3 text-sm"
                  value={rule.daysBefore}
                  onChange={(e) =>
                    update(kind, index, {
                      daysBefore: Number(e.target.value) as 0 | 1 | 3 | 7,
                    })
                  }
                >
                  {([0, 1, 3, 7] as const).map((day) => (
                    <option key={day} value={day}>
                      {t("reminderSettings", `day${day}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                {t("reminderSettings", "time")}
                <input
                  type="time"
                  required
                  className="h-10 rounded-lg border px-3"
                  value={rule.time}
                  onChange={(e) => {
                    if (e.target.validity.valid && e.target.value)
                      update(kind, index, { time: e.target.value });
                  }}
                />
              </label>
            </fieldset>
          ))}
        </fieldset>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("reminderSettings", "error")}
        </p>
      ) : null}
    </section>
  );
}
