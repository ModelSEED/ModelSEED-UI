#!/usr/bin/env node
/**
 * ModelSEED-UI API Diagnosis Script
 * 
 * Specifically tests FBA and Gapfill endpoint behavior with different reference formats.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const authToken = process.env.PATRIC_TOKEN || process.env.RAST_TOKEN;

async function testEndpoint(endpoint, ref) {
    const url = `${API_URL}/api/models/${endpoint}?ref=${encodeURIComponent(ref)}`;
    console.log(`\nTesting ${endpoint} with ref: ${ref}`);
    console.log(`URL: ${url}`);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });
        
        const status = response.status;
        const text = await response.text();
        let data = null;
        try { data = JSON.parse(text); } catch (e) {}
        
        if (response.ok) {
            console.log(`✅ Success (HTTP ${status})`);
            if (Array.isArray(data)) {
                console.log(`   Found ${data.length} items`);
            } else {
                console.log(`   Response: ${text.substring(0, 100)}`);
            }
            return true;
        } else {
            console.log(`❌ Failed (HTTP ${status})`);
            console.log(`   Error: ${text.substring(0, 200)}`);
            if (status === 404) {
                console.log(`   DIAGNOSIS: Path not found. Likely double-suffix (/model/model) or invalid object path.`);
            } else if (status === 403) {
                console.log(`   DIAGNOSIS: Permission denied. Likely username alias resolution failure on backend.`);
            }
            return false;
        }
    } catch (error) {
        console.log(`💥 Request error: ${error.message}`);
        return false;
    }
}

async function main() {
    if (!authToken) {
        console.error('No authToken found in .env.local. Please set PATRIC_TOKEN.');
        process.exit(1);
    }

    console.log('ModelSEED API Diagnosis Tool');
    console.log('============================');
    console.log(`API URL: ${API_URL}`);

    // These are placeholders - we'll try to find a real model first
    let modelBase = '/seaver@patricbrc.org/modelseed/Test';
    let modelAlias = '/seaver/modelseed/Test';
    
    // Test FBA
    console.log('\n--- FBA Endpoints ---');
    await testEndpoint('fba', modelBase);                    // Should pass (container ref)
    await testEndpoint('fba', `${modelBase}/model`);          // Should fail (double suffix)
    await testEndpoint('fba', modelAlias);                   // Might fail (alias resolution)

    // Test Gapfills
    console.log('\n--- Gapfill Endpoints ---');
    await testEndpoint('gapfills', modelBase);
    await testEndpoint('gapfills', `${modelBase}/model`);
    await testEndpoint('gapfills', modelAlias);

    console.log('\n============================');
    console.log('DETAILED RECOMMENDATIONS FOR BACKEND TEAM:');
    console.log('------------------------------------------');
    console.log('BUG 1: PATH DUPLICATION (Causes 404s)');
    console.log('   The /api/models/fba and /api/models/gapfills endpoints append "/model" to');
    console.log('   the provided "ref". If the client provides a ref already ending in "/model",');
    console.log('   the backend fails with "Object not found" (tries to find /path/model/model).');
    console.log('   FILES: model_service.py -> list_fba_studies, list_gapfill_solutions');
    console.log('\nBUG 2: ALIAS RESOLUTION (Causes 403s)');
    console.log('   The API returns 403 Forbidden for aliased paths (e.g., /seaver/modelseed/...).');
    console.log('   It only works with full PATRIC IDs (e.g., /seaver@patricbrc.org/modelseed/...).');
    console.log('   Expected: Backend should map workspace aliases to full IDs before authorization.');
}

main();
