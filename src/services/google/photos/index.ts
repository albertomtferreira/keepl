import type { GoogleIntegrationStatus } from "@/services/google/integration-status";

export function getGooglePhotosIntegrationStatus(): GoogleIntegrationStatus {
  return {
    state: "permission-required",
    label: "Google Photos needs permission",
    detail: "Photo references are supported, but Google Photos access is intentionally separate from sign-in.",
  };
}
