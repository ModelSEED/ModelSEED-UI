#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const authToken = process.env.PATRIC_TOKEN;

async function testReconstructUpload() {
    const fasta = ">test_seq\nATGCATGCATGCATGCATGC\n";
    const username = 'seaver@patricbrc.org';
    const modelName = `TestUpload_${Date.now()}`;
    const outputPath = `/${username}/modelseed/${modelName}`;

    const payload = {
        genome: modelName,
        output_path: outputPath,
        template_type: 'gn',
        media: null,
        filename: 'test.fasta',
        fasta: fasta,
        genome_fasta: fasta
    };

    console.log('Testing Reconstruction (Upload) Endpoint');
    console.log('=======================================');
    console.log(`API URL: ${API_URL}`);
    console.log(`Model Name: ${modelName}`);

    try {
        const response = await fetch(`${API_URL}/api/jobs/reconstruct`, {
            method: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        const text = await response.text();
        
        console.log(`\nHTTP Status: ${status}`);
        console.log('Response:', text);

        if (response.ok) {
            console.log('\n✅ Reconstruction (Upload) submitted successfully!');
        } else {
            console.log('\n❌ Reconstruction (Upload) failed.');
        }
    } catch (error) {
        console.error('\n💥 Error:', error.message);
    }
}

testReconstructUpload();
