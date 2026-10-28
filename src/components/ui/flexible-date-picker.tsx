"use client";

import { useId } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";

export function FlexibleDatePicker({
  value,
  includeYear,
  onChange,
  onYearChange,
  label,
  error,
  required = false,
}: {
  value: string;
  includeYear: boolean;
  onChange: (value: string) => void;
  onYearChange: (value: boolean) => void;
  label: string;
  error?: string;
  required?: boolean;
}) {
  const { locale, t } = useI18n();
  const id = useId();
  const [year = "", month = "", day = ""] = value.split("-");
  const needsDate = required || Boolean(month || day || (includeYear && year));
  function update(index: number, part: string) {
    const parts = [year, month, day];
    parts[index] = part;
    onChange(parts.every((part) => !part) ? "" : parts.join("-"));
  }
  const inputClass =
    "h-10 min-w-0 w-full rounded-lg border bg-white px-2 text-sm focus:border-primary focus:ring-3 focus:ring-ring/30";
  return (
    <fieldset
      className="min-w-0 space-y-2"
      aria-describedby={error ? `${id}-error` : `${id}-hint`}
    >
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs">
          {t("datePicker", "day")}
          <input
            className={inputClass}
            type="number"
            min="1"
            max="31"
            value={day}
            required={needsDate}
            aria-invalid={Boolean(error)}
            onChange={(event) => update(2, event.target.value)}
          />
        </label>
        <label className="min-w-0 text-xs">
          {t("datePicker", "month")}
          <select
            className={inputClass}
            value={month ? String(Number(month)) : ""}
            required={needsDate}
            aria-invalid={Boolean(error)}
            onChange={(event) => update(1, event.target.value)}
          >
            <option value="">{t("datePicker", "selectMonth")}</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index + 1}>
                {new Intl.DateTimeFormat(locale, {
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(Date.UTC(2000, index, 1)))}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeYear}
          onChange={(event) => onYearChange(event.target.checked)}
        />
        {t("datePicker", "includeYear")}
      </label>
      {includeYear ? (
        <label className="block text-xs">
          {t("datePicker", "year")}
          <input
            className={inputClass}
            type="number"
            min="1"
            max="9999"
            value={year}
            required
            onChange={(event) => update(0, event.target.value)}
          />
        </label>
      ) : null}
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t("datePicker", "hint")}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
