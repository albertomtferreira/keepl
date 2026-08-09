import { NextResponse } from "next/server";

const pickerApiBaseUrl = "https://photospicker.googleapis.com/v1";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const accessToken = params.get("accessToken");
  const sessionId = params.get("sessionId");

  if (!accessToken || !sessionId) {
    return NextResponse.json({ error: "Missing Google Photos access token or session ID." }, { status: 400 });
  }

  const url = new URL(`${pickerApiBaseUrl}/mediaItems`);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("pageSize", params.get("pageSize") ?? "100");

  const pageToken = params.get("pageToken");

  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  const response = await fetch(url, {
    headers: {
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
