import { NextResponse } from "next/server";

const pickerApiBaseUrl = "https://photospicker.googleapis.com/v1";

type SessionRouteProps = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: Request, props: SessionRouteProps) {
  const { sessionId } = await props.params;
  const accessToken = new URL(request.url).searchParams.get("accessToken");

  if (!accessToken) {
    return NextResponse.json({ error: "Missing Google Photos access token." }, { status: 401 });
  }

  return proxyGooglePhotos(`${pickerApiBaseUrl}/sessions/${sessionId}`, accessToken, { method: "GET" });
}

export async function DELETE(request: Request, props: SessionRouteProps) {
  const { sessionId } = await props.params;
  const { accessToken } = (await request.json().catch(() => ({}))) as { accessToken?: string };

  if (!accessToken) {
    return NextResponse.json({ error: "Missing Google Photos access token." }, { status: 401 });
  }

  return proxyGooglePhotos(`${pickerApiBaseUrl}/sessions/${sessionId}`, accessToken, { method: "DELETE" });
}

async function proxyGooglePhotos(url: string, accessToken: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await readJsonResponse(response);

  return NextResponse.json(body, { status: response.status });
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}
