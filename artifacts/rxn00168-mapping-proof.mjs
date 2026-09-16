import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const viewport = { width: 1500, height: 850 };
const pairs = [
  'cpd00020:C#1=cpd00011:C#1',
  'cpd00020:C#2=cpd00071:C#1',
  'cpd00020:C#3=cpd00071:C#2',
];
async function stateScreenshot(mapped) {
  const page = await browser.newPage({ viewport });
  await page.route('**/solr/reactions_staging/select**', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const doc = data.response?.docs?.[0];
    if (doc) {
      doc.atom_mapping_data = mapped ? pairs : [];
      doc.atom_mapping = [];
    }
    await route.fulfill({ response, body: JSON.stringify(data) });
  });
  await page.goto('http://localhost:3000/biochem/reactions/rxn00168', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  const tokens = await page.locator('[data-mapping-token]').count();
  if (tokens !== 4) throw new Error(`expected four rendered compounds, got ${tokens}`);
  const target = page.locator('[data-mapping-token="cpd00020"]').locator('xpath=../..').locator('xpath=..');
  await target.screenshot({ path: `/tmp/rxn00168-${mapped ? 'mapped' : 'unmapped'}.png` });
  const image = await page.locator('body').screenshot({ type: 'png' });
  await page.close();
  return image;
}
const [before, after] = await Promise.all([stateScreenshot(false), stateScreenshot(true)]);
const compose = await browser.newPage({ viewport: { width: 3040, height: 1000 } });
const encoded = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;
await compose.setContent(`<body style="margin:0;background:#eef2f6;font-family:Arial,sans-serif"><div style="display:flex;gap:20px;padding:20px"><figure style="margin:0;background:white;padding:16px;box-shadow:0 1px 4px #999"><figcaption style="font-size:24px;font-weight:700;margin-bottom:10px">Before · unmapped</figcaption><img src="${encoded(before)}" /></figure><figure style="margin:0;background:white;padding:16px;box-shadow:0 1px 4px #999"><figcaption style="font-size:24px;font-weight:700;margin-bottom:10px">After · rxn00168 mapped</figcaption><img src="${encoded(after)}" /></figure></div></body>`);
await compose.screenshot({ path: '/scratch/vsetlur/ModelSEED-UI/artifacts/rxn00168-mapping-proof.png', fullPage: true });
await browser.close();
console.log(JSON.stringify({ screenshot: 'artifacts/rxn00168-mapping-proof.png', states: ['unmapped', 'mapped'], pairs }));
