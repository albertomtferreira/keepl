import en from "./messages/en.json";
import pt from "./messages/pt.json";
import fr from "./messages/fr.json";
import es from "./messages/es.json";
import type { Locale } from "@/types/i18n";

export const messages = { en, pt, fr, es };
export type Namespace = keyof typeof en;
export type Translator = <N extends Namespace>(
  namespace: N,
  key: keyof (typeof en)[N] & string,
  values?: Record<string, string | number>,
) => string;

export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export function createTranslator(locale: Locale): Translator {
  return (namespace, key, values) => {
    const localized = messages[locale][namespace]?.[key] as string | undefined;
    if (process.env.NODE_ENV === "development" && localized === undefined) {
      console.warn(`Missing translation: ${locale}.${namespace}.${key}`);
    }
    return interpolate(
      localized ?? (messages.en[namespace][key] as string),
      values,
    );
  };
}
