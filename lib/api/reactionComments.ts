import { getStoredAuthToken, getStoredAuthUsername } from './requestAuth';

export interface SubmitReactionCommentInput {
    reactionId: string;
    isAlias: boolean;
    wrongStoichiometry: boolean;
    remarks: string;
    email: string;
}

interface SubmitReactionCommentResponse {
    msg?: string;
    message?: string;
}

export async function submitReactionComment(
    input: SubmitReactionCommentInput,
): Promise<{ message: string }> {
    const token = getStoredAuthToken();
    const username = getStoredAuthUsername();

    const response = await fetch('/api/biochem/comments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-ModelSEED-Auth': token } : {}),
        },
        body: JSON.stringify({
            ...input,
            username,
        }),
    });

    const rawText = await response.text();
    let payload: SubmitReactionCommentResponse | null = null;
    if (rawText) {
        try {
            payload = JSON.parse(rawText) as SubmitReactionCommentResponse;
        } catch {
            payload = { message: rawText };
        }
    }

    if (!response.ok) {
        const detail = payload?.message || payload?.msg || `HTTP ${response.status}`;
        throw new Error(`Failed to submit comment: ${detail}`);
    }

    return {
        message: payload?.msg || payload?.message || `Comment submitted for ${input.reactionId}.`,
    };
}
