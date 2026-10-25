import {
  proxyPhotos,
  proxyError,
  validSessionId,
} from "@/services/google/photos/proxy";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("sessionId") ?? "";
  const size = params.get("pageSize") ?? "100";
  const page = params.get("pageToken");
  if (
    !validSessionId(id) ||
    !/^(?:[1-9]|[1-9][0-9]|100)$/.test(size) ||
    (page && page.length > 4096)
  )
    return proxyError(400);
  const url = new URL("https://photospicker.googleapis.com/v1/mediaItems");
  url.searchParams.set("sessionId", id);
  url.searchParams.set("pageSize", size);
  if (page) url.searchParams.set("pageToken", page);
  return proxyPhotos(request, url);
}
