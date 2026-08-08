"use client";

import {
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ContactRound,
  Database,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { LanguageSettings } from "@/features/localization/language-settings";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  googleIntegrationStateLabels,
  type GoogleIntegrationStatus,
} from "@/services/google/integration-status";
import { getGoogleContactsIntegrationStatus } from "@/services/google/contacts";
import { getGooglePhotosIntegrationStatus } from "@/services/google/photos";

type SettingsSection = {
  title: string;
  icon: LucideIcon;
  status: GoogleIntegrationStatus;
};

const neutralStatus: GoogleIntegrationStatus = {
  state: "not-connected",
  label: "",
  detail: "",
};

const permissionStatus = (label: string, detail: string): GoogleIntegrationStatus => ({
  state: "permission-required",
  label,
  detail,
});

const stateStyles = {
  connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "not-connected": "border-border bg-secondary text-muted-foreground",
  "permission-required": "border-amber-200 bg-amber-50 text-amber-800",
};

export function SettingsClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const provider = user?.providerData.find((profile) => profile.providerId === "google.com");
  const googleStatus: GoogleIntegrationStatus = provider
    ? {
        state: "connected",
        label: t("settings", "googleConnected"),
        detail: t("settings", "googleConnectedDetail"),
      }
    : {
        state: "not-connected",
        label: t("settings", "googleUnavailable"),
        detail: t("settings", "googleUnavailableDetail"),
      };
  const localizedNeutralStatus = {
    ...neutralStatus,
    label: t("common", "notConnected"),
    detail: t("settings", "neutralDetail"),
  };

  const sections: SettingsSection[] = [
    {
      title: t("settings", "google"),
      icon: CheckCircle2,
      status: googleStatus,
    },
    {
      title: t("settings", "contacts"),
      icon: ContactRound,
      status: localizePermissionStatus(
        getGoogleContactsIntegrationStatus(),
        t("settings", "contactsPermission"),
        t("settings", "contactsPermissionDetail"),
      ),
    },
    {
      title: t("settings", "photos"),
      icon: Camera,
      status: localizePermissionStatus(
        getGooglePhotosIntegrationStatus(),
        t("settings", "photosPermission"),
        t("settings", "photosPermissionDetail"),
      ),
    },
    {
      title: t("settings", "calendar"),
      icon: CalendarDays,
      status: permissionStatus(
        t("settings", "calendarPermission"),
        t("settings", "calendarPermissionDetail"),
      ),
    },
    {
      title: t("settings", "notifications"),
      icon: Bell,
      status: permissionStatus(
        t("settings", "notificationPermission"),
        t("settings", "notificationPermissionDetail"),
      ),
    },
    {
      title: t("settings", "privacy"),
      icon: LockKeyhole,
      status: localizedNeutralStatus,
    },
    {
      title: t("settings", "data"),
      icon: Database,
      status: localizedNeutralStatus,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="size-12 rounded-full border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full border bg-secondary">
              <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold">{t("settings", "account")}</h2>
            <p className="mt-1 truncate text-sm">{user?.displayName || t("common", "signedIn")}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </section>

      <LanguageSettings />

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <IntegrationCard key={section.title} section={section} />
        ))}
      </div>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">{t("settings", "progressivePermissions")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("settings", "progressivePermissionsDetail")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function localizePermissionStatus(status: GoogleIntegrationStatus, label: string, detail: string): GoogleIntegrationStatus {
  if (status.state !== "permission-required") {
    return status;
  }

  return {
    ...status,
    label,
    detail,
  };
}

function IntegrationCard({ section }: { section: SettingsSection }) {
  const { t } = useI18n();
  const stateLabels = {
    connected: t("common", "connected"),
    "not-connected": t("common", "notConnected"),
    "permission-required": t("common", "permissionRequired"),
  };

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-secondary">
            <section.icon className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.status.label}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${stateStyles[section.status.state]}`}>
          {stateLabels[section.status.state] ?? googleIntegrationStateLabels[section.status.state]}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{section.status.detail}</p>
    </section>
  );
}
