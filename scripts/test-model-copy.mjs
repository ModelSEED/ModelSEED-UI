#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const RAST_TOKEN = process.env.RAST_TOKEN;

async function testModelCopy() {
    console.log('Testing /api/models/copy endpoint\n');
    console.log('API URL:', API_URL);
    console.log('Auth:', RAST_TOKEN ? 'RAST token present' : 'No token');
    console.log('');

    if (!RAST_TOKEN) {
        console.log('❌ No RAST_TOKEN found in .env.local');
        return;
    }

    // Step 1: Get a model to copy
    console.log('Step 1: Fetching models list...');
    const modelsRes = await fetch(`${API_URL}/api/models`, {
        headers: { 'Authorization': RAST_TOKEN }
    });
    
    if (!modelsRes.ok) {
        console.log('❌ Failed to fetch models:', modelsRes.status, modelsRes.statusText);
        return;
    }
    
    const models = await modelsRes.json();
    
    if (!models || models.length === 0) {
        console.log('❌ No models found to copy');
        return;
    }
    
    const sourceModel = models[0];
    console.log(`✅ Found source model: ${sourceModel.name || sourceModel.id} (${sourceModel.ref})`);
    console.log('');

    // Step 2: Copy the model
    const copyName = `copy_test_${Date.now()}`;
    const username = RAST_TOKEN.match(/^un=([^|]+)/)?.[1] || 'unknown';
    const destPath = `/${username}/modelseed/${copyName}`;
    
    console.log('Step 2: Copying model via /api/models/copy...');
    console.log(`  Source: ${sourceModel.ref}`);
    console.log(`  Destination: ${destPath}`);
    
    try {
        const copyRes = await fetch(`${API_URL}/api/models/copy`, {
            method: 'POST',
            headers: {
                'Authorization': RAST_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_ref: sourceModel.ref,
                destination_ref: destPath,
                copy_name: copyName
            })
        });
        
        const copyText = await copyRes.text();
        let copyResult;
        try {
            copyResult = JSON.parse(copyText);
        } catch {
            copyResult = copyText;
        }
        
        if (copyRes.ok) {
            console.log('✅ Copy successful!');
            console.log('  Status:', copyRes.status);
            console.log('  Result:', typeof copyResult === 'string' ? copyResult.substring(0, 100) : JSON.stringify(copyResult).substring(0, 100));
        } else {
            console.log('❌ Copy failed:', copyRes.status, copyRes.statusText);
            console.log('  Error:', copyResult);
            return;
        }
        console.log('');
        
        // Step 3: Verify the copy
        console.log('Step 3: Verifying copied model...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for copy to complete
        
        const verifyRes = await fetch(`${API_URL}/api/models/data?ref=${encodeURIComponent(destPath)}`, {
            headers: { 'Authorization': RAST_TOKEN }
        });
        
        if (verifyRes.ok) {
            const copiedModel = await verifyRes.json();
            console.log('✅ Copied model verified!');
            console.log(`  Name: ${copiedModel.name || copiedModel.id}`);
            console.log(`  Reactions: ${copiedModel.modelreactions?.length || 0}`);
            console.log(`  Compounds: ${copiedModel.modelcompounds?.length || 0}`);
        } else {
            console.log('⚠️  Could not verify copied model:', verifyRes.status);
            const errorText = await verifyRes.text();
            console.log('  Error:', errorText.substring(0, 200));
        }
        console.log('');
        
        // Step 4: Clean up
        console.log('Step 4: Cleaning up test copy...');
        const deleteRes = await fetch(`${API_URL}/api/workspace/delete`, {
            method: 'POST',
            headers: {
                'Authorization': RAST_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ objects: [destPath] })
        });
        
        if (deleteRes.ok) {
            console.log('✅ Test copy deleted successfully');
        } else {
            console.log('⚠️  Could not delete test copy - please delete manually:', destPath);
            console.log('   Status:', deleteRes.status);
        }
        
    } catch (err) {
        console.log('❌ Error during copy test:', err.message);
        console.log(err.stack);
    }
}

testModelCopy();
