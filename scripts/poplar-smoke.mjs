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
  DELETE_MODEL_REF    Disposable model ref for optional delete smoke check

Optional flags:
  --allow-delete-model  Run the opt-in delete-model smoke check
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
const workspaceRoot = process.env.WORKSPACE_ROOT || '/seaver/';
const deleteModelRef = process.env.DELETE_MODEL_REF;
const allowDeleteModel = argv.has('--allow-delete-model');

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
        // Workspace proxy basic ls/get
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
        // Workspace proxy create/metadata/permissions/download-url/delete
        async () => {
            const tempFolder = `${workspaceRoot.replace(/\/$/, '')}/modelseed-ui-smoke-${Date.now()}`;
            const created = await requestWithExpectedStatuses(
                'workspace:create(contract)',
                endpoint('/api/workspace/create'),
                [200, 400, 409, 422],
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        objects: [[tempFolder, 'folder', {}, null]],
                        overwrite: false,
                    }),
                },
            );
            return created;
        },
        () => requestWithExpectedStatuses(
            'workspace:metadata(contract)',
            endpoint('/api/workspace/metadata'),
            [200, 404, 422],
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objects: [workspacePath] }),
            },
        ),
        () => requestWithExpectedStatuses(
            'workspace:permissions(contract)',
            endpoint('/api/workspace/permissions'),
            [200, 404, 422],
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objects: [workspacePath] }),
            },
        ),
        () => requestWithExpectedStatuses(
            'workspace:download-url(contract)',
            endpoint('/api/workspace/download-url'),
            [200, 400, 404, 422],
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objects: [workspacePath] }),
            },
        ),
    ];

    if (allowDeleteModel) {
        if (!deleteModelRef) {
            throw new Error('DELETE_MODEL_REF is required when --allow-delete-model is set.');
        }
        tests.push(() => requestWithExpectedStatuses(
            'models:delete(opt-in)',
            endpoint(`/api/models?ref=${encodeURIComponent(deleteModelRef)}`),
            [200, 202, 204, 404, 422, 502],
            { method: 'DELETE' },
        ));
    }

    console.log(`Running smoke tests against ${baseUrl}`);
    console.log(`Model ref: ${modelRef}`);
    console.log(`Media ref: ${mediaRef}`);
    console.log(`Workspace path: ${workspacePath}`);
    if (allowDeleteModel) {
        console.log(`Delete model ref (opt-in): ${deleteModelRef}`);
    } else {
        console.log('Delete model smoke: skipped (opt-in only)');
    }
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
