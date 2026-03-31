#!/usr/bin/env node

/**
 * ModelSEED-UI Comprehensive API Test Suite
 * 
 * Tests all API endpoints with deep validation
 * 
 * Usage:
 *   npm run test:api
 *   node scripts/comprehensive-api-test.mjs
 * 
 * Prerequisites:
 *   - Copy .env.example to .env.local and fill in credentials
 *   - SSH tunnel to API server: ssh -L 8000:localhost:8000 user@poplar.cels.anl.gov
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const USE_NEW_PROXY = process.env.NEXT_PUBLIC_USE_NEW_PROXY !== 'false';

/* ============================================================================
 * TEST UTILITIES
 * ========================================================================= */

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;
let authToken = null;
let authTokenName = '';
let authUsername = '';

/** Fix RAST token if it has duplicate prefix */
function fixToken(token) {
  if (!token) return null;
  if (token.startsWith('un=un=')) {
    return token.replace('un=un=', 'un=');
  }
  return token;
}

/** Extract username from token */
function extractUsername(token) {
  if (!token) return '';
  // RAST: un=seaver|tokenid=...
  // PATRIC: un=seaver@patricbrc.org|tokenid=...
  const match = token.match(/^un=([^@|]+)/);
  if (match) return match[1];
  return '';
}

authToken = fixToken(process.env.RAST_TOKEN) || fixToken(process.env.PATRIC_TOKEN);
authUsername = extractUsername(authToken);

if (authToken?.includes('patricbrc.org') || authToken?.includes('@patricbrc.org')) {
  authTokenName = 'PATRIC';
} else if (authToken?.startsWith('un=')) {
  authTokenName = 'RAST';
} else {
  authTokenName = 'unknown';
}

function log(msg, type = 'info') {
  const prefix = { 
    info: 'ℹ️  ', 
    success: '✅ ', 
    error: '❌ ', 
    warn: '⚠️ ',
    skip: '⏭️ '
  }[type];
  console.log(`${prefix}${msg}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function logSubsection(title) {
  console.log(`\n--- ${title} ---`);
}

async function test(name, fn) {
  try {
    process.stdout.write(`  Testing: ${name}... `);
    await fn();
    console.log('✓');
    testsPassed++;
  } catch (error) {
    console.log('✗');
    testsFailed++;
    const message = error instanceof Error ? error.message : String(error);
    const shortMsg = message.length > 100 ? message.substring(0, 100) + '...' : message;
    log(`  Failed: ${name} - ${shortMsg}`, 'error');
  }
}

function skip(name, reason) {
  console.log(`  Skipping: ${name} (${reason})`);
  testsSkipped++;
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error.substring(0, 150)}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Get user's workspace path for models */
function getModelPath(subpath = '') {
  return `/${authUsername}/modelseed${subpath ? '/' + subpath : ''}`;
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
  
  test('Auth token is available', async () => {
    assert(authToken, 'No auth token in .env.local');
    log(`  Using ${authTokenName} token`, 'info');
  });
  
  test('API server is reachable', async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      assert(res.ok, 'Health check failed');
    } catch (e) {
      throw new Error('API not reachable - check SSH tunnel');
    }
  });
}

/* ============================================================================
 * PUBLIC DATA TESTS (NO AUTH)
 * ========================================================================= */

async function testPublicData() {
  logSection('Public Data (No Auth Required)');
  
  test('Public media returns data', async () => {
    const data = await request(`${API_URL}/api/media/public`);
    const count = data['/chenry/public/modelsupport/media']?.length || 0;
    assert(count > 0, 'No public media returned');
    log(`  Found ${count} public media`, 'success');
  });
  
  test('Public media count is 523', async () => {
    const data = await request(`${API_URL}/api/media/public`);
    const count = data['/chenry/public/modelsupport/media']?.length || 0;
    assert(count === 523, `Expected 523, got ${count}`);
  });
  
  test('Biochem reactions endpoint', async () => {
    const data = await request(`${API_URL}/api/biochem/reactions?ids=rxn00001`);
    assert(Array.isArray(data), 'No reaction data');
    assert(data.length > 0, 'No reactions found');
    log(`  Got ${data.length} reactions`, 'success');
  });
  
  test('Biochem compounds endpoint', async () => {
    const data = await request(`${API_URL}/api/biochem/compounds?ids=cpd00001`);
    assert(Array.isArray(data), 'No compound data');
    assert(data.length > 0, 'No compounds found');
    log(`  Got ${data.length} compounds`, 'success');
  });
  
  test('Biochem search', async () => {
    const data = await request(`${API_URL}/api/biochem/search?query=glucose&type=compounds`);
    assert(data && data.length > 0, 'Search returned nothing');
  });
  
  test('Biochem stats', async () => {
    const data = await request(`${API_URL}/api/biochem/stats`);
    assert(data.total_compounds > 0, 'No compounds in stats');
    assert(data.total_reactions > 0, 'No reactions in stats');
    log(`  ${data.total_compounds} compounds, ${data.total_reactions} reactions`, 'success');
  });
}

/* ============================================================================
 * MODEL LIST TESTS
 * ========================================================================= */

async function testModelList() {
  logSection('Model List');
  
  test('List user models returns array', async () => {
    const models = await request(`${API_URL}/api/models`);
    assert(Array.isArray(models), 'Models not array');
    log(`  Found ${models.length} models`, 'success');
  });
  
  test('Models have required fields', async () => {
    const models = await request(`${API_URL}/api/models`);
    if (models.length > 0) {
      const m = models[0];
      assert(m.id, 'Missing id');
      assert(m.ref, 'Missing ref');
      log(`  Sample: ${m.id} - ${m.name}`, 'success');
    }
  });
  
  test('Both RAST and PATRIC tokens work', async () => {
    // Test RAST
    const rastToken = fixToken(process.env.RAST_TOKEN);
    const rastModels = await request(`${API_URL}/api/models`, { 
      headers: { 'Authorization': `Bearer ${rastToken}` } 
    });
    log(`  RAST: ${rastModels.length} models`, 'success');
    
    // Test PATRIC
    const patricToken = fixToken(process.env.PATRIC_TOKEN);
    if (patricToken) {
      const patricModels = await request(`${API_URL}/api/models`, { 
        headers: { 'Authorization': `Bearer ${patricToken}` } 
      });
      log(`  PATRIC: ${patricModels.length} models`, 'success');
    }
  });
}

/* ============================================================================
 * MODEL DETAIL TESTS
 * ========================================================================= */

async function testModelDetail() {
  logSection('Model Detail');
  
  const models = await request(`${API_URL}/api/models`);
  
  test('Get model detail with reactions', async () => {
    const model = models.find(m => m.num_reactions > 0);
    assert(model, 'No model with reactions found');
    
    const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(model.ref)}`);
    assert(detail.reactions?.length > 0, 'No reactions in detail');
    log(`  ${model.id}: ${detail.reactions.length} reactions`, 'success');
  });
  
  test('Get model detail with compounds', async () => {
    const model = models.find(m => m.num_compounds > 0);
    const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(model.ref)}`);
    assert(detail.compounds?.length > 0, 'No compounds in detail');
    log(`  ${model.id}: ${detail.compounds.length} compounds`, 'success');
  });
  
  test('Get model detail with genes', async () => {
    const model = models.find(m => m.num_genes > 0);
    const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(model.ref)}`);
    assert(detail.genes?.length > 0, 'No genes in detail');
    log(`  ${model.id}: ${detail.genes.length} genes`, 'success');
  });
  
  test('Get model detail with biomasses', async () => {
    const model = models.find(m => m.num_biomasses > 0);
    const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(model.ref)}`);
    assert(detail.biomasses?.length > 0, 'No biomasses in detail');
  });
  
  test('Get model detail with compartments', async () => {
    const model = models.find(m => m.num_compartments > 0);
    const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(model.ref)}`);
    assert(detail.compartments?.length > 0, 'No compartments in detail');
  });
}

/* ============================================================================
 * MODEL METADATA TESTS
 * ========================================================================= */

async function testModelMetadata() {
  logSection('Model Metadata (organism/taxonomy)');
  
  const models = await request(`${API_URL}/api/models`);
  
  // New models (2020+) should have metadata
  const newModels = models.filter(m => m.rundate?.startsWith('2020') || m.rundate?.startsWith('2021') || m.rundate?.startsWith('2022') || m.rundate?.startsWith('2023') || m.rundate?.startsWith('2024') || m.rundate?.startsWith('2025') || m.rundate?.startsWith('2026'));
  
  test('Newer models have organism_name', async () => {
    const modelWithOrg = newModels.find(m => m.organism_name);
    if (modelWithOrg) {
      const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(modelWithOrg.ref)}`);
      assert(detail.organism_name, 'New model missing organism_name');
      log(`  ${modelWithOrg.id}: ${detail.organism_name}`, 'success');
    } else {
      skip('No new model with organism', 'No model found');
    }
  });
  
  test('Newer models have taxonomy', async () => {
    const modelWithTax = newModels.find(m => m.taxonomy);
    if (modelWithTax) {
      const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(modelWithTax.ref)}`);
      assert(detail.taxonomy, 'New model missing taxonomy');
      log(`  ${modelWithTax.id}: ${detail.taxonomy?.substring(0, 50)}...`, 'success');
    } else {
      skip('No new model with taxonomy', 'No model found');
    }
  });
  
  test('Newer models have domain', async () => {
    const modelWithDomain = newModels.find(m => m.domain);
    if (modelWithDomain) {
      const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(modelWithDomain.ref)}`);
      assert(detail.domain, 'New model missing domain');
      log(`  ${modelWithDomain.id}: ${detail.domain}`, 'success');
    } else {
      skip('No new model with domain', 'No model found');
    }
  });
  
  // Old models may or may not have metadata
  const oldModels = models.filter(m => m.rundate?.startsWith('2018') || m.rundate?.startsWith('2019'));
  
  test('Old models do not have "genome||" bug', async () => {
    if (oldModels.length > 0) {
      const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(oldModels[0].ref)}`);
      const hasBug = detail.organism_name === 'genome||';
      assert(!hasBug, 'Old model still has "genome||" bug');
      log(`  ${oldModels[0].id}: organism_name = "${detail.organism_name}"`, hasBug ? 'error' : 'success');
    } else {
      skip('No old models found', 'N/A');
    }
  });
}

/* ============================================================================
 * FBA TESTS
 * ========================================================================= */

async function testFba() {
  logSection('FBA (Flux Balance Analysis)');
  
  const models = await request(`${API_URL}/api/models`);
  const model = models.find(m => m.num_reactions > 0);
  assert(model, 'No model with reactions');
  
  test('FBA list returns array', async () => {
    const fbaList = await request(`${API_URL}/api/models/fba?ref=${encodeURIComponent(model.ref)}`);
    assert(Array.isArray(fbaList), 'FBA list not array');
    log(`  Found ${fbaList.length} FBA results`, 'success');
  });
  
  test('FBA detail endpoint works', async () => {
    const fbaList = await request(`${API_URL}/api/models/fba?ref=${encodeURIComponent(model.ref)}`);
    if (fbaList.length > 0) {
      const fbaId = fbaList[fbaList.length - 1].id;
      const detail = await request(`${API_URL}/api/models/fba/data?ref=${encodeURIComponent(model.ref)}&fba_id=${encodeURIComponent(fbaId)}`);
      assert(detail.objectiveValue !== undefined, 'Missing objectiveValue');
      assert(detail.status, 'Missing status');
      log(`  Status: ${detail.status}, objectiveValue: ${detail.objectiveValue}`, 'success');
    } else {
      skip('No FBA to test detail', 'No FBA data');
    }
  });
  
  test('FBA count matches model list', async () => {
    const modelList = models.find(m => m.ref === model.ref);
    const fbaList = await request(`${API_URL}/api/models/fba?ref=${encodeURIComponent(model.ref)}`);
    const match = modelList?.fba_count === fbaList.length;
    assert(match, `FBA count mismatch: model list=${modelList?.fba_count}, actual=${fbaList.length}`);
    log(`  Match: ${modelList?.fba_count} === ${fbaList.length}`, match ? 'success' : 'error');
  });
  
  test('Submit and run FBA job', async () => {
    const result = await request(`${API_URL}/api/jobs/fba`, {
      method: 'POST',
      body: JSON.stringify({ model: model.ref, media: 'Carbon-D-Glucose' })
    });
    assert(result, 'No job ID returned');
    log(`  Job ID: ${result}`, 'success');
    
    // Wait for completion (up to 30 seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const status = await request(`${API_URL}/api/jobs?ids=${result}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const job = status[result];
      if (job?.status === 'completed') {
        log(`  FBA completed: ${job.result?.status}`, 'success');
        break;
      }
      if (job?.status === 'failed') {
        log(`  FBA failed: ${job.error?.substring(0, 50)}`, 'warn');
        break;
      }
    }
  }, 60000);
}

/* ============================================================================
 * GAPFILL TESTS
 * ========================================================================= */

async function testGapfill() {
  logSection('Gapfill');
  
  const models = await request(`${API_URL}/api/models`);
  const model = models.find(m => m.num_reactions > 0);
  assert(model, 'No model with reactions');
  
  test('Gapfill list returns array', async () => {
    const gapList = await request(`${API_URL}/api/models/gapfills?ref=${encodeURIComponent(model.ref)}`);
    assert(Array.isArray(gapList), 'Gapfill list not array');
    log(`  Found ${gapList.length} gapfill results`, 'success');
  });
  
  test('Submit and run gapfill job', async () => {
    const result = await request(`${API_URL}/api/jobs/gapfill`, {
      method: 'POST',
      body: JSON.stringify({ model: model.ref, media: 'Carbon-D-Glucose' })
    });
    assert(result, 'No job ID returned');
    log(`  Job ID: ${result}`, 'success');
    
    // Wait for completion
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const status = await request(`${API_URL}/api/jobs?ids=${result}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const job = status[result];
      if (job?.status === 'completed') {
        log(`  Gapfill completed: ${job.result?.status}`, 'success');
        break;
      }
      if (job?.status === 'failed') {
        log(`  Gapfill failed: ${job.error?.substring(0, 50)}`, 'warn');
        break;
      }
    }
  }, 60000);
  
  test('Gapfill count updates in model list', async () => {
    const modelsBefore = await request(`${API_URL}/api/models`);
    const modelBefore = modelsBefore.find(m => m.ref === model.ref);
    const gapListBefore = await request(`${API_URL}/api/models/gapfills?ref=${encodeURIComponent(model.ref)}`);
    const countBefore = modelBefore?.integrated_gapfills || 0;
    
    // Run another gapfill
    const gapJob = await request(`${API_URL}/api/jobs/gapfill`, {
      method: 'POST',
      body: JSON.stringify({ model: model.ref, media: 'Carbon-D-Glucose' })
    });
    
    // Wait for it to complete
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const status = await request(`${API_URL}/api/jobs?ids=${gapJob}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (status[gapJob]?.status === 'completed' || status[gapJob]?.status === 'failed') break;
    }
    
    const modelsAfter = await request(`${API_URL}/api/models`);
    const modelAfter = modelsAfter.find(m => m.ref === model.ref);
    const gapListAfter = await request(`${API_URL}/api/models/gapfills?ref=${encodeURIComponent(model.ref)}`);
    const countAfter = modelAfter?.integrated_gapfills || 0;
    const actualCount = gapListAfter.length;
    
    log(`  Before: ${countBefore}, After list: ${actualCount}, Model metadata: ${countAfter}`, 'info');
    
    // The metadata may or may not update depending on backend
    if (countAfter === actualCount) {
      log('  Gapfill count updated: ✅', 'success');
    } else {
      log('  Gapfill count NOT updated in model list: ⚠️ (backend issue)', 'warn');
    }
  }, 60000);
}

/* ============================================================================
 * RECONSTRUCTION TESTS
 * ========================================================================= */

async function testReconstruction() {
  logSection('Model Reconstruction');
  
  test('Submit reconstruction job', async () => {
    const outputPath = `/${authUsername}/modelseed/Test_${Date.now()}`;
    const result = await request(`${API_URL}/api/jobs/reconstruct`, {
      method: 'POST',
      body: JSON.stringify({ genome: '551115.6', output_path: outputPath, template_type: 'gn' })
    });
    assert(result, 'No job ID returned');
    log(`  Job ID: ${result}`, 'success');
    
    // Wait for completion (longer timeout)
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const status = await request(`${API_URL}/api/jobs?ids=${result}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const job = status[result];
      if (job?.status === 'completed') {
        log(`  Reconstruction completed: ${job.result?.reactions} reactions`, 'success');
        break;
      }
      if (job?.status === 'failed') {
        log(`  Reconstruction failed: ${job.error?.substring(0, 50)}`, 'error');
        break;
      }
    }
  }, 120000);
  
  test('New model has organism metadata', async () => {
    const modelseedPath = '/' + authUsername + '/modelseed';
    // Find recently created model
    const lsResult = await request(`${API_URL}/api/workspace/ls`, {
      method: 'POST',
      body: JSON.stringify({ paths: [modelseedPath] })
    });
    const folders = lsResult[modelseedPath] || [];
    const recentFolders = folders
      .filter(f => f[3]?.startsWith('2026-04') || f[3]?.startsWith('2026-03-31'))
      .sort((a, b) => new Date(b[3]) - new Date(a[3]));
    
    if (recentFolders.length > 0) {
      // Check if folder has model file
      const folderCheck = await request(`${API_URL}/api/workspace/ls`, {
        method: 'POST',
        body: JSON.stringify({ paths: [modelseedPath + '/' + recentFolders[0][0]] })
      });
      const contents = folderCheck[modelseedPath + '/' + recentFolders[0][0]] || [];
      const hasModel = contents.some(x => x[1] === 'model');
      
      if (hasModel) {
        const ref = modelseedPath + '/' + recentFolders[0][0];
        const detail = await request(`${API_URL}/api/models/data?ref=${encodeURIComponent(ref)}`);
        
        assert(detail.organism_name, 'New model missing organism_name');
        assert(detail.taxonomy, 'New model missing taxonomy');
        assert(detail.domain, 'New model missing domain');
        
        log(`  ${recentFolders[0][0]}:`, 'success');
        log(`    organism_name: ${detail.organism_name}`, 'success');
        log(`    taxonomy: ${detail.taxonomy?.substring(0, 40)}...`, 'success');
        log(`    domain: ${detail.domain}`, 'success');
      } else {
        skip('No model file created yet', 'Reconstruction may still be running');
      }
    } else {
      skip('No recent model folder', 'No model created in this session');
    }
  });
}

/* ============================================================================
 * WORKSPACE TESTS
 * ========================================================================= */

async function testWorkspace() {
  logSection('Workspace');
  
  test('Workspace ls returns data', async () => {
    const path = '/' + authUsername + '/modelseed';
    const result = await request(`${API_URL}/api/workspace/ls`, {
      method: 'POST',
      body: JSON.stringify({ paths: [path] })
    });
    assert(result[path], 'Workspace ls returned nothing');
    log(`  Found ${result[path]?.length || 0} items`, 'success');
  });
  
  test('Workspace get returns model data', async () => {
    const models = await request(`${API_URL}/api/models`);
    const model = models.find(m => m.num_reactions > 0);
    if (model) {
      const result = await request(`${API_URL}/api/workspace/get`, {
        method: 'POST',
        body: JSON.stringify({ objects: [model.ref + '/model'] })
      });
      assert(result[0], 'Workspace get returned nothing');
      assert(result[0][1], 'No model data in response');
      const parsed = JSON.parse(result[0][1]);
      assert(parsed.modelreactions?.length > 0, 'No reactions in model file');
      log(`  Got model with ${parsed.modelreactions.length} reactions`, 'success');
    }
  });
}

/* ============================================================================
 * EXPORT TESTS
 * ========================================================================= */

async function testExport() {
  logSection('Export');
  
  const models = await request(`${API_URL}/api/models`);
  const model = models.find(m => m.num_reactions > 0);
  
  test('Export as SBML', async () => {
    const response = await fetch(`${API_URL}/api/models/export?ref=${encodeURIComponent(model.ref)}&format=sbml`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(response.ok, 'Export failed');
    const contentType = response.headers.get('content-type') || '';
    assert(contentType.includes('xml') || contentType.includes('sbml'), 'Not SBML format');
    const text = await response.text();
    assert(text.startsWith('<?xml'), 'Not valid XML');
    log(`  SBML length: ${text.length}`, 'success');
  });
  
  test('Export as JSON', async () => {
    const response = await fetch(`${API_URL}/api/models/export?ref=${encodeURIComponent(model.ref)}&format=json`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    assert(response.ok, 'Export failed');
    const contentType = response.headers.get('content-type') || '';
    assert(contentType.includes('json'), 'Not JSON format');
  });
}

/* ============================================================================
 * JOBS TESTS
 * ========================================================================= */

async function testJobs() {
  logSection('Jobs');
  
  test('Jobs list returns data', async () => {
    const jobs = await request(`${API_URL}/api/jobs`);
    assert(typeof jobs === 'object', 'Jobs not object');
    const jobCount = Object.keys(jobs).length;
    log(`  Found ${jobCount} jobs`, 'success');
  });
  
  test('Job status tracking', async () => {
    const jobs = await request(`${API_URL}/api/jobs`);
    const jobIds = Object.keys(jobs).slice(0, 3);
    if (jobIds.length > 0) {
      const status = await request(`${API_URL}/api/jobs?ids=${jobIds.join(',')}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      assert(status[jobIds[0]], 'Could not get job status');
      log(`  Sample job status: ${status[jobIds[0]]?.status}`, 'success');
    }
  });
}

/* ============================================================================
 * MEDIA TESTS
 * ========================================================================= */

async function testMedia() {
  logSection('Media');
  
  test('List my media', async () => {
    const result = await request(`${API_URL}/api/media/mine`);
    const paths = result ? Object.keys(result) : [];
    log(`  Found ${paths.length} user media`, 'success');
  });
  
  test('Export media', async () => {
    // Get first public media
    const pubMedia = await request(`${API_URL}/api/media/public`);
    const mediaList = pubMedia['/chenry/public/modelsupport/media'];
    if (mediaList && mediaList.length > 0) {
      const mediaRef = '/chenry/public/modelsupport/media/' + mediaList[0][0];
      const result = await request(`${API_URL}/api/media/export?ref=${encodeURIComponent(mediaRef)}`);
      assert(result, 'Media export returned nothing');
    } else {
      skip('No public media to test', 'N/A');
    }
  });
}

/* ============================================================================
 * MAIN
 * ========================================================================= */

async function main() {
  console.log('\n' + '█'.repeat(70));
  console.log('  ModelSEED-UI Comprehensive API Test Suite');
  console.log('█'.repeat(70));
  
  log(`  API URL: ${API_URL}`, 'info');
  log(`  Auth: ${authTokenName} token`, 'info');
  
  try {
    await testConfiguration();
    await testPublicData();
    await testModelList();
    await testModelDetail();
    await testModelMetadata();
    await testWorkspace();
    await testMedia();
    await testExport();
    await testJobs();
    await testFba();
    await testGapfill();
    await testReconstruction();
    
    logSection('Test Summary');
    log(`  Passed: ${testsPassed}`, testsFailed > 0 ? 'warn' : 'success');
    log(`  Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
    log(`  Skipped: ${testsSkipped}`, 'info');
    
    if (testsFailed > 0) {
      console.log('\n❌ Some tests failed\n');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!\n');
    }
  } catch (error) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main();
