#!/usr/bin/env node

const argv = new Set(process.argv.slice(2));

if (argv.has('--help') || argv.has('-h')) {
    console.log(`Usage: node scripts/poplar-smoke.mjs

Environment variables:
  PATRIC_TOKEN        Raw PATRIC auth token (required)
  MODELSEED_API_URL   API base URL (default: http://poplar.cels.anl.gov:8000)
  MODEL_REF           Model workspace ref for detail checks
                      (default: /seaver@patricbrc.org/modelseed/Test)
  MEDIA_REF           Media workspace ref for export checks
                      (default: /chenry/public/modelsupport/media/Complete)
  WORKSPACE_PATH      Workspace path for ls/get checks
                      (default: /seaver@patricbrc.org/modelseed/)
`);
    process.exit(0);
}

const token = process.env.PATRIC_TOKEN;
if (!token) {
    console.error('Missing PATRIC_TOKEN. Export a raw token before running smoke tests.');
    process.exit(1);
}

const baseUrl = (process.env.MODELSEED_API_URL || 'http://poplar.cels.anl.gov:8000').replace(/\/$/, '');
const modelRef = process.env.MODEL_REF || '/seaver@patricbrc.org/modelseed/Test';
const mediaRef = process.env.MEDIA_REF || '/chenry/public/modelsupport/media/Complete';
const workspacePath = process.env.WORKSPACE_PATH || '/seaver@patricbrc.org/modelseed/';

const headers = {
    Accept: 'application/json',
    Authorization: token,
};

function extractUsernameFromToken(rawToken) {
    const parts = rawToken.split('|');
    for (const part of parts) {
        if (part.startsWith('un=')) return part.slice(3);
    }
    return null;
}

async function request(name, url, init = {}) {
    const response = await fetch(url, {
        ...init,
        headers: {
            ...headers,
            ...(init.headers || {}),
        },
    });
    const text = await response.text().catch(() => '');
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }
    return {
        name,
        url,
        status: response.status,
        httpOk: response.ok,
        pass: response.ok,
        expectedStatuses: null,
        text,
        json,
    };
}

function endpoint(path) {
    return `${baseUrl}${path}`;
}

function requestWithExpectedStatuses(name, url, expectedStatuses, init = {}) {
    return request(name, url, init).then((result) => ({
        ...result,
        expectedStatuses,
        pass: expectedStatuses.includes(result.status),
    }));
}

function outputResult(result) {
    if (result.pass) {
        const qualifier = result.expectedStatuses ? ' (contract)' : '';
        console.log(`PASS${qualifier} ${result.name} -> ${result.status}`);
        return;
    }
    const detail = result.json?.detail
        || result.json?.error?.message
        || result.json?.message
        || result.text
        || 'Unknown error';
    console.log(`FAIL ${result.name} -> ${result.status}: ${detail}`);
}

async function run() {
    const username = extractUsernameFromToken(token);
    const mediaWorkspacePaths = username
        ? [`/${username}/media`, `/${username}/modelseed/media`]
        : [];

    const mineMediaTest = async () => {
        const direct = await request('media:mine', endpoint('/api/media/mine'));
        if (direct.ok) return direct;
        if (mediaWorkspacePaths.length === 0) return direct;

        for (const mediaWorkspacePath of mediaWorkspacePaths) {
            const fallback = await request('media:mine(fallback workspace ls)', endpoint('/api/workspace/ls'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths: [mediaWorkspacePath] }),
            });
            if (fallback.ok) {
                return {
                    ...fallback,
                    name: 'media:mine',
                };
            }
        }
        return direct;
    };

    const tests = [
        () => request('models:list', endpoint('/api/models')),
        () => request('models:data', endpoint(`/api/models/data?ref=${encodeURIComponent(modelRef)}`)),
        () => request('models:gapfills', endpoint(`/api/models/gapfills?ref=${encodeURIComponent(modelRef)}`)),
        () => request('models:fba', endpoint(`/api/models/fba?ref=${encodeURIComponent(modelRef)}`)),
        () => request('media:public', endpoint('/api/media/public')),
        mineMediaTest,
        () => requestWithExpectedStatuses(
            'media:export(contract)',
            endpoint(`/api/media/export?ref=${encodeURIComponent(mediaRef)}`),
            [200, 404, 422, 502],
        ),
        () => requestWithExpectedStatuses(
            'models:edits(contract)',
            endpoint(`/api/models/edits?ref=${encodeURIComponent(modelRef)}`),
            [200, 404, 501, 502],
        ),
        () => requestWithExpectedStatuses(
            'models:edit(contract)',
            endpoint('/api/models/edit'),
            [200, 400, 422, 501],
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelRef,
                    operation: 'noop',
                }),
            },
        ),
        () => requestWithExpectedStatuses(
            'jobs:merge(contract)',
            endpoint('/api/jobs/merge'),
            [200, 400, 422, 502],
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    models: [],
                    output_path: workspacePath,
                }),
            },
        ),
        () => request('workspace:ls', endpoint('/api/workspace/ls'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: [workspacePath] }),
        }),
        () => request('workspace:get', endpoint('/api/workspace/get'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objects: [modelRef] }),
        }),
    ];

    console.log(`Running smoke tests against ${baseUrl}`);
    console.log(`Model ref: ${modelRef}`);
    console.log(`Media ref: ${mediaRef}`);
    console.log(`Workspace path: ${workspacePath}`);
    console.log('');

    const results = [];
    for (const test of tests) {
        const result = await test();
        results.push(result);
        outputResult(result);
    }

    const failures = results.filter((r) => !r.pass);
    console.log('');
    console.log(`Summary: ${results.length - failures.length}/${results.length} passed`);

    if (failures.length > 0) {
        process.exit(1);
    }
}

run().catch((error) => {
    console.error('Smoke test crashed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
});
