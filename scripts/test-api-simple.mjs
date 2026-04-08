#!/usr/bin/env node
import 'dotenv/config';

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const RAST_TOKEN = process.env.RAST_TOKEN;

async function test(name, url, token) {
    try {
        const headers = token ? { 'Authorization': token } : {};
        const res = await fetch(url, { headers });
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : (data.count || '?');
        console.log(`✅ ${name}: ${res.status} - ${count} items`);
        return data;
    } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
    }
}

console.log('API:', API_URL, '\n');

await test('Health', `${API_URL}/api/health`);
await test('Public Media', `${API_URL}/api/media/public`);
await test('My Models', `${API_URL}/api/models`, RAST_TOKEN);
const modelData = await test('Model Data', `${API_URL}/api/models/data?ref=/seaver/modelseed/Test_Microbe`, RAST_TOKEN);
const fbaData = await test('Model FBA', `${API_URL}/api/models/fba?ref=/seaver/modelseed/Test_Microbe/model`, RAST_TOKEN);
const gapfillData = await test('Model Gapfills', `${API_URL}/api/models/gapfills?ref=/seaver/modelseed/Test_Microbe/model`, RAST_TOKEN);

console.log('\n--- Sample Data ---');
if (modelData) console.log('Model reactions:', modelData.modelreactions?.length || 0);
if (fbaData) console.log('FBA results:', fbaData.length, '- First ID:', fbaData[0]?.id);
if (gapfillData) console.log('Gapfills:', gapfillData.length, '- First ID:', gapfillData[0]?.id);
