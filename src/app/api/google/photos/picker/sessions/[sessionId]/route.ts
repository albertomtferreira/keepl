import {
  proxyPhotos,
  proxyError,
  validSessionId,
} from "@/services/google/photos/proxy";
type Props = { params: Promise<{ sessionId: string }> };
async function handle(request: Request, props: Props) {
  const { sessionId } = await props.params;
  if (!validSessionId(sessionId)) return proxyError(400);
  return proxyPhotos(
    request,
    `https://photospicker.googleapis.com/v1/sessions/${sessionId}`,
    { method: request.method },
  );
}
export const GET = handle;
export const DELETE = handle;
