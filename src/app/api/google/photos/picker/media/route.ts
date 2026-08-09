import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { accessToken, mediaUrl } = (await request.json()) as {
    accessToken?: string;
    mediaUrl?: string;
  };

  if (!accessToken || !mediaUrl) {
    return NextResponse.json({ error: "Missing Google Photos access token or media URL." }, { status: 400 });
  }

  if (!isAllowedGooglePhotosMediaUrl(mediaUrl)) {
    return NextResponse.json({ error: "Unsupported Google Photos media URL." }, { status: 400 });
  }

  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: await getErrorMessage(response) }, { status: response.status });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
    },
  });
}

function isAllowedGooglePhotosMediaUrl(mediaUrl: string) {
  try {
    const url = new URL(mediaUrl);
    return url.protocol === "https:" && url.hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

async function getErrorMessage(response: Response) {
  const fallback = `Google Photos media request failed with status ${response.status}.`;
  const text = await response.text().catch(() => "");
  return text || fallback;
}
