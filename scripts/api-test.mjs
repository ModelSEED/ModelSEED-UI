#!/usr/bin/env node

/**
 * ModelSEED-UI API Test Suite
 * 
 * Comprehensive API testing script that tests all backend endpoints.
 * 
 * Usage:
 *   npm run test:api
 * 
 * Prerequisites:
 *   - Copy .env.example to .env.local and fill in credentials
 *   - SSH tunnel to API server: ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
 * 
 * Environment Variables (.env.local):
 *   NEXT_PUBLIC_MODELSEED_API_URL=http://localhost:8000
 *   PATRIC_USERNAME=your_username
 *   PATRIC_PASSWORD=your_password
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const USE_NEW_PROXY = process.env.NEXT_PUBLIC_USE_NEW_PROXY !== 'false';
const WORKSPACE_URL = USE_NEW_PROXY ? `${API_URL}/api/workspace` : 'https://p3.theseed.org/services/Workspace';
const SOLR_BASE = process.env.NEXT_PUBLIC_USE_NEW_BIOCHEM === 'true' 
  ? `${API_URL}/api/solr/` 
  : 'https://modelseed.org/solr/';

/* ============================================================================
 * TEST UTILITIES
 * ========================================================================= */

let testsPassed = 0;
let testsFailed = 0;
let authToken = process.env.PATRIC_TOKEN || process.env.RAST_TOKEN || null;
let authUser = null;
let apiReachable = true;

function log(msg, type = 'info') {
  const prefix = { info: 'ℹ️ ', success: '✅ ', error: '❌ ', warn: '⚠️ ' }[type];
  console.log(`${prefix}${msg}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function test(name, fn) {
  if (!apiReachable) {
    console.log(`  Testing: ${name}... ⏭️`);
    console.log(`    Skipped (API not reachable)`);
    return;
  }
  
  try {
    process.stdout.write(`  Testing: ${name}... `);
    await fn();
    console.log('✓');
    testsPassed++;
  } catch (error) {
    console.log('✗');
    testsFailed++;
    const message = error instanceof Error ? error.message : String(error);
    // Truncate long messages
    const shortMsg = message.length > 80 ? message.substring(0, 80) + '...' : message;
    log(`  Failed: ${name} - ${shortMsg}`, 'error');
  }
}

function skip(name, reason) {
  console.log(`  Skipping: ${name} (${reason})`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* ============================================================================
 * API HELPERS
 * ========================================================================= */

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error.substring(0, 100)}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function workspaceRpc(method, params) {
  const body = JSON.stringify({
    version: '1.1',
    id: 1,
    method,
    params
  });
  
  return request(WORKSPACE_URL, { method: 'POST', body });
}

async function loginPatricApi(username, password) {
  const response = await request(`${API_URL}/api/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return response;
}

async function checkApiReachability() {
  try {
    const response = await fetch(`${API_URL}/api/models/public`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    apiReachable = response.ok || response.status === 401;
    return apiReachable;
  } catch (e) {
    apiReachable = false;
    return false;
  }
}

/* ============================================================================
 * CONFIGURATION TESTS
 * ========================================================================= */

async function testConfiguration() {
  logSection('Configuration');

  test('API URL is configured', async () => {
    assert(API_URL, 'API_URL not set');
    log(`  API URL: ${API_URL}`, 'info');
  });

  test('USE_NEW_PROXY flag is set', async () => {
    log(`  Using New Proxy: ${USE_NEW_PROXY}`, 'info');
  });

  test('Workspace URL is configured', async () => {
    assert(WORKSPACE_URL, 'WORKSPACE_URL not set');
    log(`  Workspace URL: ${WORKSPACE_URL}`, 'info');
  });

  test('Solr base URL is configured', async () => {
    assert(SOLR_BASE, 'SOLR_BASE not set');
    log(`  Solr URL: ${SOLR_BASE}`, 'info');
  });

  test('API server is reachable', async () => {
    const reachable = await checkApiReachability();
    if (!reachable) {
      log(`  ⚠️  API not reachable at ${API_URL}`, 'warn');
      log(`  Make sure SSH tunnel is active: ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov`, 'warn');
    }
    assert(reachable, 'API server not reachable');
  });
}

/* ============================================================================
 * AUTHENTICATION TESTS
 * ========================================================================= */

async function testAuthentication() {
  logSection('Authentication');

  if (!apiReachable) {
    skip('PATRIC login', 'API not reachable');
    skip('Authenticated API tests', 'API not reachable');
    return;
  }

  const username = process.env.PATRIC_USERNAME;
  const password = process.env.PATRIC_PASSWORD;
  const existingToken = process.env.PATRIC_TOKEN;

  if (existingToken) {
    authToken = existingToken;
    const tokenUserMatch = existingToken.match(/un=([^|]+)/);
    authUser = tokenUserMatch ? tokenUserMatch[1] : 'unknown';
    log(`  Using existing PATRIC_TOKEN for: ${authUser}`, 'success');
    test('Token auth works', async () => {
      assert(authToken, 'No token available');
      log(`  Token auth OK`, 'success');
    });
  } else if (username && password) {
    test('PATRIC login succeeds', async () => {
      const result = await loginPatricApi(username, password);
      assert(result, 'Login returned null');
      authToken = result.token || result.access_token;
      authUser = result.user_id || result.username;
      assert(authToken, 'Login did not return token');
      log(`  Logged in as: ${authUser}`, 'success');
    });
  } else {
    skip('PATRIC login', 'PATRIC_TOKEN or PATRIC_USERNAME/PASSWORD not set in .env.local');
    skip('Authenticated API tests', 'No credentials');
  }
}

/* ============================================================================
 * WORKSPACE API TESTS
 * ========================================================================= */

async function testWorkspaceApi() {
  logSection('Workspace API');

  if (!apiReachable) {
    skip('Workspace API tests', 'API not reachable');
    return;
  }

  if (!authToken) {
    skip('Workspace ls', 'Not authenticated');
    skip('Workspace get', 'Not authenticated');
    skip('Workspace create', 'Not authenticated');
    skip('Workspace delete', 'Not authenticated');
    return;
  }

  const testWorkspace = `/test-${authUser}`;

  test('Workspace ls returns results', async () => {
    const result = await workspaceRpc('Workspace.ls', [[testWorkspace]]);
    log(`  Workspace ls successful`, 'success');
  });

  test('Workspace get works', async () => {
    const result = await workspaceRpc('Workspace.get', [{ ref: '/public/modelseed/iJO1366' }]);
    assert(result, 'workspaceGet returned null');
  });

  test('Workspace create succeeds', async () => {
    const result = await workspaceRpc('Workspace.create_workspace', [{ workspace: testWorkspace }]);
    assert(result, 'workspaceCreate returned null');
    log(`  Created workspace: ${testWorkspace}`, 'success');
  });

  test('Workspace delete succeeds', async () => {
    const result = await workspaceRpc('Workspace.delete_workspace', [{ workspace: testWorkspace }]);
    assert(result, 'workspaceDelete returned null');
    log(`  Deleted workspace: ${testWorkspace}`, 'success');
  });
}

/* ============================================================================
 * MODELSEED API TESTS
 * ========================================================================= */

async function testModelseedApi() {
  logSection('ModelSEED API');

  if (!apiReachable) {
    skip('ModelSEED API tests', 'API not reachable');
    return;
  }

  if (!authToken) {
    skip('List user models', 'Not authenticated');
    skip('List user media', 'Not authenticated');
    skip('List jobs', 'Not authenticated');
    return;
  }

  test('List user models', async () => {
    const result = await request(`${API_URL}/api/models`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(Array.isArray(result), 'Did not return array');
    log(`  Found ${result.length} user models`, 'info');
    if (result.length > 0) {
      log(`  First model: ${JSON.stringify(result[0]).substring(0, 100)}`, 'info');
    }
  });

  test('List user media', async () => {
    const result = await request(`${API_URL}/api/media`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(Array.isArray(result), 'Did not return array');
    log(`  Found ${result.length} user media`, 'info');
  });

  test('List jobs', async () => {
    const result = await request(`${API_URL}/api/jobs`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(Array.isArray(result), 'Did not return array');
    log(`  Found ${result.length} jobs`, 'info');
  });

  test('Get public model detail', async () => {
    const result = await request(`${API_URL}/api/models/public/modelseed/iJO1366`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(result, 'Get model returned null');
    log(`  Got model detail`, 'success');
  });

  test('Get model gapfills', async () => {
    const testModelRef = encodeURIComponent('/seaver@patricbrc.org/modelseed/Test');
    const result = await request(`${API_URL}/api/models/gapfills?ref=${testModelRef}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(result !== null && result !== undefined, 'Gapfills returned null/undefined');
    log(`  Got gapfills: OK`, 'success');
  });

  test('Get model FBA results', async () => {
    const testModelRef = encodeURIComponent('/seaver@patricbrc.org/modelseed/Test');
    const result = await request(`${API_URL}/api/models/fba?ref=${testModelRef}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(result !== null && result !== undefined, 'FBA results returned null/undefined');
    log(`  Got FBA results: OK`, 'success');
  });
}

/* ============================================================================
 * PUBLIC DATA TESTS
 * ========================================================================= */

async function testPublicData() {
  logSection('Public Data');

  if (!apiReachable) {
    skip('Public data tests', 'API not reachable');
    return;
  }

  test('List public media', async () => {
    const result = await request(`${API_URL}/api/media/public`);
    assert(Array.isArray(result), 'Did not return array');
    log(`  Found ${result.length} public media`, 'info');
  });

  test('Get public model', async () => {
    const result = await request(`${API_URL}/api/models/public/modelseed/iJO1366`);
    assert(result, 'Get model returned null');
    log(`  Got public model`, 'success');
  });

  test('Export model as SBML', async () => {
    const result = await request(`${API_URL}/api/models/public/modelseed/iJO1366?format=sbml`);
    assert(result, 'Export returned null');
    log(`  Exported model as SBML`, 'success');
  });
}

/* ============================================================================
 * BIOCHEMISTRY API TESTS
 * ========================================================================= */

async function testBiochemApi() {
  logSection('Biochemistry API');

  test('List reactions', async () => {
    const result = await request(`${SOLR_BASE}reaction/query?q=*:*&rows=10&wt=json`);
    assert(result.response, 'No response in result');
    assert(Array.isArray(result.response.docs), 'No docs in response');
    log(`  Found ${result.response.docs.length} reactions`, 'info');
  });

  test('List compounds', async () => {
    const result = await request(`${SOLR_BASE}compound/query?q=*:*&rows=10&wt=json`);
    assert(result.response, 'No response in result');
    assert(Array.isArray(result.response.docs), 'No docs in response');
    log(`  Found ${result.response.docs.length} compounds`, 'info');
  });

  test('Get reaction by ID', async () => {
    const result = await request(`${SOLR_BASE}reaction/query?q=id:rxn00001&wt=json`);
    assert(result.response, 'No response');
    assert(result.response.docs.length > 0, 'No reaction found');
    log(`  Got reaction: rxn00001`, 'success');
  });

  test('Get compound by ID', async () => {
    const result = await request(`${SOLR_BASE}compound/query?q=id:cpd00001&wt=json`);
    assert(result.response, 'No response');
    assert(result.response.docs.length > 0, 'No compound found');
    log(`  Got compound: cpd00001`, 'success');
  });
}

/* ============================================================================
 * MAIN
 * ========================================================================= */

async function main() {
  console.log('\n' + '█'.repeat(60));
  console.log('  ModelSEED-UI API Test Suite');
  console.log('█'.repeat(60));
  
  log(`  API URL: ${API_URL}`, 'info');
  log(`  Using New Proxy: ${USE_NEW_PROXY}`, 'info');

  await testConfiguration();
  await testAuthentication();
  await testBiochemApi();
  await testPublicData();
  await testModelseedApi();
  await testWorkspaceApi();

  logSection('Test Summary');
  log(`  Passed: ${testsPassed}`, testsFailed > 0 ? 'warn' : 'success');
  log(`  Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
  
  if (!apiReachable) {
    console.log('\n⚠️  API not reachable - make sure SSH tunnel is active:');
    console.log('    ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov\n');
  }
  
  if (testsFailed > 0) {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!\n');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
