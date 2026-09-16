import { NextRequest, NextResponse } from 'next/server';
import { MODELSEED_REST_URL } from '@/lib/api/config';

interface FeedbackRequestBody {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  area?: unknown;
  environment?: unknown;
  email?: unknown;
  username?: unknown;
  pageUrl?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(request: NextRequest) {
  let body: FeedbackRequestBody;
  try {
    body = (await request.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const type = str(body.type);
  const title = str(body.title);
  const description = str(body.description);
  const area = str(body.area);
  const environment = str(body.environment);
  const email = str(body.email);
  const username = str(body.username);
  const pageUrl = str(body.pageUrl);

  if (!title || !description) {
    return NextResponse.json(
      { message: 'Title and description are required.' },
      { status: 400 },
    );
  }

  const payload = {
    type: type || 'Feedback',
    title,
    description,
    area: area || 'Other',
    environment: environment || 'Not sure',
    pageUrl: pageUrl || undefined,
    user: {
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
    },
  };

  const formData = new URLSearchParams({ feedback: JSON.stringify(payload) });

  // Auth is optional for feedback; forward if the client sent it.
  const upstreamAuth = request.headers.get('x-modelseed-auth');

  try {
    const response = await fetch(`${MODELSEED_REST_URL}/feedback`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(upstreamAuth ? { Authorization: upstreamAuth } : {}),
      },
      body: formData.toString(),
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText) {
      try { parsed = JSON.parse(rawText); } catch { parsed = { message: rawText }; }
    }

    const pick = (o: unknown, k: 'msg' | 'message'): string | null =>
      typeof o === 'object' && o !== null && typeof (o as Record<string, unknown>)[k] === 'string'
        ? ((o as Record<string, string>)[k])
        : null;

    if (!response.ok) {
      const detail = pick(parsed, 'msg') ?? pick(parsed, 'message') ?? rawText ?? `HTTP ${response.status}`;
      return NextResponse.json({ message: detail }, { status: response.status });
    }

    const msg = pick(parsed, 'msg') ?? pick(parsed, 'message') ?? 'Feedback submitted. Thank you!';
    return NextResponse.json({ msg });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach feedback service.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
