/**
 * Server-side proxy for RAST genome annotation jobs.
 *
 * Proxies GET /api/rast/jobs from the configured modelseed-api backend.
 * Runs server-side so it can access PATRIC_TOKEN and avoid CORS restrictions.
 *
 * The upstream endpoint requires MODELSEED_RAST_DB_HOST to be set on the
 * modelseed-api server. Returns 503 with a clear message when not configured.
 */
import { NextRequest, NextResponse } from 'next/server';

/** Build a deduplicated list of upstream URLs to try in priority order. */
function buildUpstreamCandidates(): string[] {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
    const candidates = new Set<string>();
    if (configured) {
        candidates.add(`${configured}/api/rast/jobs`);
    }
    candidates.add('https://staging.modelseed.org/PMS/api/rast/jobs');
    candidates.add('https://modelseed.org/PMS/api/rast/jobs');
    return Array.from(candidates);
}

const UPSTREAM_CANDIDATES = buildUpstreamCandidates();

export async function GET(request: NextRequest): Promise<NextResponse> {
    // Prefer the token from the client request; fall back to server-side env
    const token =
        request.headers.get('authorization') ||
        process.env.PATRIC_TOKEN;

    if (!token) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 },
        );
    }

    const headers: HeadersInit = {
        Accept: 'application/json',
        Authorization: token,
    };

    let lastStatus = 503;
    let lastDetail: string | null = null;

    for (const url of UPSTREAM_CANDIDATES) {
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });

            if (res.ok) {
                const data: unknown = await res.json();
                return NextResponse.json(data);
            }

            // Capture the detail for the final error response
            lastStatus = res.status;
            try {
                const body = await res.json() as Record<string, unknown>;
                lastDetail = typeof body.detail === 'string' ? body.detail : null;
            } catch {
                // ignore JSON parse failure on error body
            }

            console.warn(`[rast/jobs proxy] ${url} → HTTP ${res.status}${lastDetail ? ': ' + lastDetail : ''}`);
        } catch (err) {
            console.warn(
                `[rast/jobs proxy] ${url} unreachable:`,
                err instanceof Error ? err.message : err,
            );
        }
    }

    // All upstreams failed — return the last known status/detail
    return NextResponse.json(
        {
            error: 'RAST jobs service unavailable',
            detail: lastDetail ?? 'All upstream endpoints failed',
            jobs: [],
        },
        { status: lastStatus },
    );
}
