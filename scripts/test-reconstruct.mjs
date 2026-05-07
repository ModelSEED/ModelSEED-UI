#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const authToken = process.env.PATRIC_TOKEN;

async function testReconstruct() {
    // Using a known genome ID that might be in PATRIC
    const genomeId = '83332.12'; 
    const username = 'seaver@patricbrc.org';
    const modelName = `TestReconstruct_${Date.now()}`;
    const outputPath = `/${username}/modelseed/${modelName}`;

    const payload = {
        genome: genomeId,
        output_path: outputPath,
        template_type: 'gn',
        media: null
    };

    console.log('Testing Reconstruction Endpoint');
    console.log('==============================');
    console.log(`API URL: ${API_URL}`);
    console.log(`Genome: ${genomeId}`);
    console.log(`Output Path: ${outputPath}`);
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
        const response = await fetch(`${API_URL}/api/jobs/reconstruct`, {
            method: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const text = await response.text();
        
        console.log(`\nHTTP Status: ${status}`);
        try {
            const data = JSON.parse(text);
            console.log('Response:', JSON.stringify(data, null, 2));
        } catch (e) {
            console.log('Raw Response:', text);
        }

        if (response.ok) {
            const jobId = JSON.parse(text);
            console.log(`\n✅ Reconstruction job submitted successfully! Job ID: ${jobId}`);
            
            // Poll status
            console.log('\nPolling job status...');
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                const statusRes = await fetch(`${API_URL}/api/jobs?ids=${jobId}`, {
                    headers: { 'Authorization': authToken }
                });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    const status = statusData[0]?.status ?? statusData[jobId]?.status ?? 'unknown';
                    console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);
                    if (status === 'completed' || status === 'error' || status === 'failed') break;
                } else {
                    console.log(`❌ Failed to fetch status (HTTP ${statusRes.status})`);
                }
            }
        } else {
            console.log('\n❌ Reconstruction job submission failed.');
        }
    } catch (error) {
        console.error('\n💥 Fetch Error:', error.message);
    }
}

testReconstruct();
