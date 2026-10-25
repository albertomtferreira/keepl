import {
  bearer,
  proxyError,
  proxyPhotos,
  isAllowedGooglePhotosMediaUrl,
} from "@/services/google/photos/proxy";
export async function POST(request: Request) {
  if (!bearer(request)) return proxyError(401);
  const body = await request.json().catch(() => null);
  if (!isAllowedGooglePhotosMediaUrl(body?.mediaUrl)) return proxyError(400);
  return proxyPhotos(request, body.mediaUrl, {}, true);
}
