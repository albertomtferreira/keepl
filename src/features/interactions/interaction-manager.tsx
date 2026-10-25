"use client";

import { Timestamp } from "firebase/firestore";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  interactionKindLabels,
  formatInteractionDate,
} from "@/features/interactions/interaction-format";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { interactionsRepository } from "@/repositories/interactions";
import type { Interaction, InteractionKind } from "@/types";

const interactionKinds = Object.keys(
  interactionKindLabels,
) as InteractionKind[];

export function InteractionManager({
  interactions,
  onChange,
  personId,
}: {
  interactions: Interaction[];
  onChange: (interactions: Interaction[]) => void;
  personId: string;
}) {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const [kind, setKind] = useState<InteractionKind>("message");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<
    | keyof (typeof import("@/lib/i18n/messages/en.json"))["interactions"]
    | "signInSave"
    | null
  >(null);

  async function addInteraction() {
    if (!user) {
      setError("signInSave");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const id = await interactionsRepository.create(user.uid, {
        personId,
        kind,
        occurredAt: Timestamp.fromDate(new Date(`${occurredAt}T12:00:00`)),
        ...(summary.trim() ? { summary: summary.trim() } : {}),
      });
      const created = await interactionsRepository.getById(user.uid, id);

      if (created) {
        onChange(
          [created, ...interactions].sort(
            (first, second) =>
              second.occurredAt.toMillis() - first.occurredAt.toMillis(),
          ),
        );
      }

      setSummary("");
    } catch {
      setError("saveError");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInteraction(interaction: Interaction) {
    if (!user || !confirm(t("interactions", "deleteConfirm"))) {
      return;
    }

    await interactionsRepository.delete(user.uid, interaction.id);
    onChange(interactions.filter((item) => item.id !== interaction.id));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr_auto]">
        <select
          aria-label={t("interactions", "kind")}
          value={kind}
          onChange={(event) => setKind(event.target.value as InteractionKind)}
          className={inputClassName}
        >
          {interactionKinds.map((item) => (
            <option key={item} value={item}>
              {t("interactions", item)}
            </option>
          ))}
        </select>
        <input
          aria-label={t("interactions", "date")}
          type="date"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
          className={inputClassName}
        />
        <input
          aria-label={t("interactions", "summary")}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder={t("interactions", "summary")}
          className={inputClassName}
        />
        <Button
          type="button"
          onClick={addInteraction}
          disabled={saving || !occurredAt}
          size="sm"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("common", "add")}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          {error === "signInSave"
            ? t("common", "signInSave")
            : t("interactions", error)}
        </p>
      ) : null}

      {interactions.length ? (
        <div className="space-y-2">
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex items-start gap-3 rounded-lg border bg-white/70 p-3"
            >
              <MessageCircle
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t("interactions", interaction.kind)}{" "}
                  <span className="font-normal text-muted-foreground">
                    {formatInteractionDate(interaction, locale)}
                  </span>
                </p>
                {interaction.summary ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {interaction.summary}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("interactions", "delete")}
                onClick={() => deleteInteraction(interaction)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const inputClassName =
  "h-9 min-w-0 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";
