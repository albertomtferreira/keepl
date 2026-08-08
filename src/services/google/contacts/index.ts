import type { GoogleIntegrationStatus } from "@/services/google/integration-status";

export function getGoogleContactsIntegrationStatus(): GoogleIntegrationStatus {
  return {
    state: "permission-required",
    label: "Google Contacts needs permission",
    detail: "Keepl has a service boundary ready, but contact access is not requested during sign-in.",
  };
}
