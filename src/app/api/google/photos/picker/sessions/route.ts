import { NextResponse } from "next/server";

const pickerApiBaseUrl = "https://photospicker.googleapis.com/v1";

export async function POST(request: Request) {
  const { accessToken } = (await request.json()) as { accessToken?: string };

  if (!accessToken) {
    return NextResponse.json({ error: "Missing Google Photos access token." }, { status: 401 });
  }

  return proxyGooglePhotos(`${pickerApiBaseUrl}/sessions`, accessToken, {
    method: "POST",
    body: JSON.stringify({ pickingConfig: { maxItemCount: "50" } }),
  });
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
