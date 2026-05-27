/**
 * Server-side proxy for RAST genome data.
 *
 * Proxies GET /api/rast/genome from the configured modelseed-api backend.
 * Runs server-side so it can access PATRIC_TOKEN and avoid CORS restrictions.
 */
import { NextRequest, NextResponse } from 'next/server';

function buildUpstreamCandidates(params: string): string[] {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');
    const candidates = new Set<string>();
    if (configured) {
        candidates.add(`${configured}/api/rast/genome?${params}`);
    }
    candidates.add(`https://staging.modelseed.org/PMS/api/rast/genome?${params}`);
    candidates.add(`https://modelseed.org/PMS/api/rast/genome?${params}`);
    return Array.from(candidates);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const token =
        request.headers.get('authorization') ||
        process.env.PATRIC_TOKEN;

    if (!token) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 },
        );
    }

    const { searchParams } = new URL(request.url);
    const genomeId = searchParams.get('genome_id');
    const jobId = searchParams.get('job_id');

    if (!genomeId) {
        return NextResponse.json(
            { error: 'genome_id is required' },
            { status: 400 },
        );
    }

    const params = new URLSearchParams({ genome_id: genomeId });
    if (jobId) params.set('job_id', jobId);

    const headers: HeadersInit = {
        Accept: 'application/json',
        Authorization: token,
    };

    const upstreamCandidates = buildUpstreamCandidates(params.toString());
    let lastStatus = 503;
    let lastDetail: string | null = null;

    for (const url of upstreamCandidates) {
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });

            if (res.ok) {
                const data: unknown = await res.json();
                return NextResponse.json(data);
            }

            lastStatus = res.status;
            try {
                const body = await res.json() as Record<string, unknown>;
                lastDetail = typeof body.detail === 'string' ? body.detail : null;
            } catch {
                // ignore JSON parse failure
            }

            console.warn(`[rast/genome proxy] ${url} → HTTP ${res.status}${lastDetail ? ': ' + lastDetail : ''}`);
        } catch (err) {
            console.warn(
                `[rast/genome proxy] ${url} unreachable:`,
                err instanceof Error ? err.message : err,
            );
        }
    }

    return NextResponse.json(
        {
            error: 'RAST genome data service unavailable',
            detail: lastDetail ?? 'All upstream endpoints failed',
        },
        { status: lastStatus },
    );
}
