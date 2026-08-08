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

import { useAuth } from "@/lib/auth/auth-context";
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
  label: "Not connected",
  detail: "This area is available in settings without any additional external connection.",
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
  const provider = user?.providerData.find((profile) => profile.providerId === "google.com");
  const googleStatus: GoogleIntegrationStatus = provider
    ? {
        state: "connected",
        label: "Google account connected",
        detail: "Sign-in is connected. Contacts, Photos, and Calendar permissions remain separate.",
      }
    : {
        state: "not-connected",
        label: "Google sign-in unavailable",
        detail: "No Google provider is attached to the current account.",
      };

  const sections: SettingsSection[] = [
    {
      title: "Google",
      icon: CheckCircle2,
      status: googleStatus,
    },
    {
      title: "Contacts",
      icon: ContactRound,
      status: getGoogleContactsIntegrationStatus(),
    },
    {
      title: "Photos",
      icon: Camera,
      status: getGooglePhotosIntegrationStatus(),
    },
    {
      title: "Calendar",
      icon: CalendarDays,
      status: permissionStatus(
        "Google Calendar needs permission",
        "Calendar reminders are planned, but calendar access is not requested during sign-in.",
      ),
    },
    {
      title: "Notifications",
      icon: Bell,
      status: permissionStatus(
        "Browser permission not requested",
        "Reminder notifications will ask only when notification features are enabled.",
      ),
    },
    {
      title: "Privacy",
      icon: LockKeyhole,
      status: neutralStatus,
    },
    {
      title: "Data",
      icon: Database,
      status: neutralStatus,
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
            <h2 className="font-semibold">Account</h2>
            <p className="mt-1 truncate text-sm">{user?.displayName || "Signed in"}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <IntegrationCard key={section.title} section={section} />
        ))}
      </div>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Progressive permissions</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keepl only uses Google sign-in right now. Contacts, Photos, Calendar, and notification
              permissions are kept behind their own future connection steps.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function IntegrationCard({ section }: { section: SettingsSection }) {
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
          {googleIntegrationStateLabels[section.status.state]}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{section.status.detail}</p>
    </section>
  );
}
