#!/usr/bin/env node

/**
 * Test FASTA upload for model reconstruction
 * 
 * Tests uploading FASTA files to see why they fail
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function fixToken(token) {
  if (!token) return null;
  if (token.startsWith('un=un=')) return token.replace('un=un=', 'un=');
  return token;
}
function extractUsername(token) {
  if (!token) return '';
  const match = token.match(/^un=([^@|]+)/);
  return match ? match[1] : '';
}

const token = fixToken(process.env.RAST_TOKEN) || fixToken(process.env.PATRIC_TOKEN);
const username = extractUsername(token);

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
  }
  
  return text ? JSON.parse(text) : null;
}

import fs from 'fs';
import zlib from 'zlib';

async function testProteinFasta() {
  console.log('\n=== Testing Protein FASTA (.faa.gz) ===');
  
  // Decompress and read
  const compressed = fs.readFileSync('legacy/GCF_000005845.2_ASM584v2_protein.faa.gz');
  const decompressed = zlib.gunzipSync(compressed);
  const fastaText = decompressed.toString('utf8').substring(0, 1000); // First 1000 chars
  
  console.log('FASTA preview:', fastaText.substring(0, 200));
  
  const payload = {
    genome: 'GCF_000005845.2_test_protein',
    output_path: `/${username}/modelseed/GCF_000005845.2_test_protein`,
    template_type: 'gn',
    genome_fasta: fastaText,
    filename: 'GCF_000005845.2_ASM584v2_protein.faa'
  };
  
  console.log('\nSubmitting reconstruction with protein FASTA...');
  try {
    const result = await request(`${API_URL}/api/jobs/reconstruct`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log('Result:', result);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function testGenomicFasta() {
  console.log('\n=== Testing Genomic FASTA (.fna.gz) ===');
  
  // Decompress and read
  const compressed = fs.readFileSync('legacy/GCF_000005845.2_ASM584v2_genomic.fna.gz');
  const decompressed = zlib.gunzipSync(compressed);
  const fastaText = decompressed.toString('utf8').substring(0, 1000);
  
  console.log('FASTA preview:', fastaText.substring(0, 200));
  
  const payload = {
    genome: 'GCF_000005845.2_test_genomic',
    output_path: `/${username}/modelseed/GCF_000005845.2_test_genomic`,
    template_type: 'gn',
    genome_fasta: fastaText,
    filename: 'GCF_000005845.2_ASM584v2_genomic.fna'
  };
  
  console.log('\nSubmitting reconstruction with genomic FASTA...');
  try {
    const result = await request(`${API_URL}/api/jobs/reconstruct`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log('Result:', result);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function testWorkingReference() {
  console.log('\n=== Testing Working Reference (genome ID 551115.6) ===');
  
  const payload = {
    genome: '551115.6',
    output_path: `/${username}/modelseed/Test_551115_6`,
    template_type: 'gn'
  };
  
  console.log('Submitting reconstruction with genome ID...');
  try {
    const result = await request(`${API_URL}/api/jobs/reconstruct`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log('Result:', result);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function main() {
  console.log('Testing FASTA Upload for Model Reconstruction');
  console.log('API URL:', API_URL);
  console.log('Username:', username);
  
  // First verify the API is reachable
  try {
    await request(`${API_URL}/api/health`);
    console.log('API is reachable');
  } catch (err) {
    console.log('API not reachable:', err.message);
    return;
  }
  
  await testProteinFasta();
  await testGenomicFasta();
  await testWorkingReference();
}

main().catch(console.error);