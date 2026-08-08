export type GoogleIntegrationState = "connected" | "not-connected" | "permission-required";

export type GoogleIntegrationStatus = {
  state: GoogleIntegrationState;
  label: string;
  detail: string;
};

export const googleIntegrationStateLabels: Record<GoogleIntegrationState, string> = {
  connected: "Connected",
  "not-connected": "Not connected",
  "permission-required": "Permission required",
};
