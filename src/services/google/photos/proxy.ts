// These routes are stateless Google capability proxies: the bearer grants only
// Google Photos access. They never read Keepl data or persist credentials.
export function proxyError(status: number) {
  return Response.json(
    {
      error:
        status === 401 || status === 403
          ? "permission-required"
          : status === 404 || status === 410
            ? "media-unavailable"
            : "photos-request-failed",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function bearer(request: Request) {
  if (new URL(request.url).searchParams.has("accessToken")) return null;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return null;
  return (
    /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/.exec(
      request.headers.get("authorization") ?? "",
    )?.[1] ?? null
  );
}

export function validSessionId(value: string) {
  return /^[A-Za-z0-9_-]{1,512}$/.test(value);
}

export function isAllowedGooglePhotosMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 8192) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".googleusercontent.com") &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export async function proxyPhotos(
  request: Request,
  url: string | URL,
  init: RequestInit = {},
  media = false,
) {
  const token = bearer(request);
  if (!token) return proxyError(401);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok)
      return proxyError(
        [400, 401, 403, 404, 410, 429].includes(response.status)
          ? response.status
          : 502,
      );
    if (media) {
      const type = response.headers.get("content-type") ?? "";
      if (!/^(image|video)\//.test(type)) return proxyError(502);
      return new Response(response.body, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": type,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (response.status === 204)
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    return Response.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return proxyError(502);
  }
}
