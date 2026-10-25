import type { GoogleIntegrationStatus } from "@/services/google/integration-status";

export function getGoogleContactsIntegrationStatus(): GoogleIntegrationStatus {
  return {
    state: "permission-required",
    label: "Google Contacts needs permission",
    detail:
      "Connect explicitly to import selected contacts and review updates. Contact access is not requested during sign-in.",
  };
}
