export type GooglePhotosConnectionState = "not-connected" | "permission-required" | "connected";

export type GooglePhotosIntegrationStatus = {
  state: GooglePhotosConnectionState;
  label: string;
};

export function getGooglePhotosIntegrationStatus(): GooglePhotosIntegrationStatus {
  return {
    state: "not-connected",
    label: "Google Photos is not connected",
  };
}
