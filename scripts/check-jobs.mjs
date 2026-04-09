import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function fixToken(token) {
  if (!token) return null;
  if (token.startsWith('un=un=')) return token.replace('un=un=', 'un=');
  return token;
}

const token = fixToken(process.env.RAST_TOKEN);
const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL;

const jobs = {
  'e60bb1ce-9cfa-4ee3-b1df-4da671e655a4': 'Protein FASTA',
  '1dd5ecb7-49e3-4357-ac56-ac388f6cfb8c': 'Genomic FASTA', 
  '899dc7ea-2bfb-4ecc-a257-2da21158859f': 'Genome ID'
};

async function checkJobs() {
  const ids = Object.keys(jobs).join(',');
  const response = await fetch(API_URL + '/api/jobs?ids=' + ids, { 
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await response.json();

  console.log('=== Job Statuses ===');
  Object.entries(jobs).forEach(([id, label]) => {
    const job = data[id];
    console.log(`${label}: ${job?.status || 'unknown'}`);
    if (job?.status === 'completed') console.log(`  Result: ${JSON.stringify(job.result).substring(0,150)}`);
    if (job?.status === 'failed') console.log(`  Error: ${(job?.error || 'unknown').substring(0,150)}`);
  });
}

checkJobs();