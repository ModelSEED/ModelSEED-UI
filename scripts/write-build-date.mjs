import fs from 'node:fs';
import path from 'node:path';

const buildDate = new Date().toISOString().slice(0, 10);
const outputPath = path.join(process.cwd(), '.build-date');

fs.writeFileSync(outputPath, `${buildDate}\n`);
console.log(`[build-date] Wrote ${buildDate} to ${outputPath}`);
