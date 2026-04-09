import 'dotenv/config';
const token = process.env.PATRIC_TOKEN;

async function test() {
  // Get user models with counts
  const res = await fetch("http://localhost:8000/api/models", {
    headers: { "Authorization": "Bearer " + token }
  });
  const data = await res.json();
  
  const models = Array.isArray(data) ? data : [];
  
  console.log("=== Model Counts ===");
  models.forEach(m => {
    console.log(`${m.id}: fba_count=${m.fba_count}, gapfills=${m.gapfills}`);
  });
  
  // Check specific models
  const targets = ["TestCADG", "Ecoli_Test", "Tegfa", "Test"];
  console.log("\n=== Checking Specific Models ===");
  for (const t of targets) {
    const m = models.find(m => m.id === t);
    if (m) {
      // Get actual counts from API
      const fbaRes = await fetch(`http://localhost:8000/api/models/fba?ref=${encodeURIComponent(m.ref)}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      const fba = await fbaRes.json();
      const fbaCount = Array.isArray(fba) ? fba.length : 0;
      
      const gapRes = await fetch(`http://localhost:8000/api/models/gapfills?ref=${encodeURIComponent(m.ref)}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      const gap = await gapRes.json();
      const gapCount = Array.isArray(gap) ? gap.length : 0;
      
      console.log(`${t} (${m.ref}):`);
      console.log(`  Listed: fba=${m.fba_count}, gapfills=${m.gapfills}`);
      console.log(`  Actual: fba=${fbaCount}, gapfills=${gapCount}`);
    } else {
      console.log(`${t}: NOT FOUND`);
    }
  }
}
test();
