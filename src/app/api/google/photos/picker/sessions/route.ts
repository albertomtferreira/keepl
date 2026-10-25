import { proxyPhotos } from "@/services/google/photos/proxy";
export async function POST(request: Request) {
  return proxyPhotos(
    request,
    "https://photospicker.googleapis.com/v1/sessions",
    {
      method: "POST",
      body: JSON.stringify({ pickingConfig: { maxItemCount: "50" } }),
    },
  );
}
