import fs from 'node:fs';
import path from 'node:path';

const envVersion = process.env.NEXT_PUBLIC_GIT_VERSION;
if (!envVersion) {
  console.log('[sync-version] NEXT_PUBLIC_GIT_VERSION not set; skipping package.json sync.');
  process.exit(0);
}

const semverLike = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
if (!semverLike.test(envVersion)) {
  console.error(`[sync-version] Invalid NEXT_PUBLIC_GIT_VERSION: "${envVersion}"`);
  process.exit(1);
}

const packagePath = path.join(process.cwd(), 'package.json');
const packageRaw = fs.readFileSync(packagePath, 'utf8');
const pkg = JSON.parse(packageRaw);

if (pkg.version === envVersion) {
  console.log(`[sync-version] package.json already at version ${envVersion}`);
  process.exit(0);
}

pkg.version = envVersion;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`[sync-version] Updated package.json version -> ${envVersion}`);
