import { NextRequest, NextResponse } from 'next/server';
import { MODELSEED_REST_URL } from '@/lib/api/config';

interface CommentRequestBody {
    reactionId?: unknown;
    isAlias?: unknown;
    wrongStoichiometry?: unknown;
    remarks?: unknown;
    email?: unknown;
    username?: unknown;
}

export async function POST(request: NextRequest) {
    const body = (await request.json()) as CommentRequestBody;
    const reactionId = typeof body.reactionId === 'string' ? body.reactionId.trim() : '';
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const isAlias = Boolean(body.isAlias);
    const wrongStoichiometry = Boolean(body.wrongStoichiometry);

    if (!reactionId) {
        return NextResponse.json({ message: 'reactionId is required' }, { status: 400 });
    }

    const selectedComments: string[] = [];
    if (isAlias) selectedComments.push('incorrect alias');
    if (wrongStoichiometry) selectedComments.push('incorrect stoichiometry');

    if (!remarks && selectedComments.length === 0) {
        return NextResponse.json(
            { message: 'Select at least one issue or provide remarks before submitting.' },
            { status: 400 },
        );
    }

    const legacyPayload = {
        user: {
            ...(username ? { username } : {}),
            ...(email ? { email } : {}),
            ...(remarks ? { remarks } : {}),
        },
        rowId: reactionId,
        comments: selectedComments,
    };

    const formData = new URLSearchParams({
        comment: JSON.stringify(legacyPayload),
    });

    const upstreamAuth = request.headers.get('x-modelseed-auth');
    try {
        const response = await fetch(`${MODELSEED_REST_URL}/comments`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(upstreamAuth ? { Authorization: upstreamAuth } : {}),
            },
            body: formData.toString(),
        });

        const rawText = await response.text();
        let payload: unknown = null;
        if (rawText) {
            try {
                payload = JSON.parse(rawText);
            } catch {
                payload = { message: rawText };
            }
        }

        if (!response.ok) {
            const detail =
                typeof payload === 'object' &&
                payload !== null &&
                typeof (payload as { msg?: unknown; message?: unknown }).msg === 'string'
                    ? (payload as { msg: string }).msg
                    : typeof payload === 'object' &&
                      payload !== null &&
                      typeof (payload as { message?: unknown }).message === 'string'
                      ? (payload as { message: string }).message
                      : rawText || `HTTP ${response.status}`;
            return NextResponse.json({ message: detail }, { status: response.status });
        }

        const message =
            typeof payload === 'object' &&
            payload !== null &&
            typeof (payload as { msg?: unknown; message?: unknown }).msg === 'string'
                ? (payload as { msg: string }).msg
                : typeof payload === 'object' &&
                  payload !== null &&
                  typeof (payload as { message?: unknown }).message === 'string'
                  ? (payload as { message: string }).message
                  : `Comment submitted for ${reactionId}.`;

        return NextResponse.json({ msg: message });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to reach comment service.';
        return NextResponse.json({ message }, { status: 502 });
    }
}
