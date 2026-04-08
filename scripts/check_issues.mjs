import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_MODELSEED_API_URL || 'http://localhost:8000';
const authToken = process.env.PATRIC_TOKEN || process.env.RAST_TOKEN || process.env.NEXT_PUBLIC_PATRIC_TOKEN;

async function checkIssues() {
  const headers = { 
     'Authorization': `Bearer ${authToken}`,
     'Accept': 'application/json',
     'Content-Type': 'application/json'
  };

  // POST to ls
  let lsUrl = `${API_URL}/api/workspace/ls`;
  const res = await fetch(lsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: ['/seaver@patricbrc.org/modelseed/Test/'] })
  });

  const files = await res.json();
  console.log("Root files in /Test/:");
  Object.keys(files).forEach(k => {
      files[k].forEach(f => console.log(" - ", f[0])); // f[0] is typically the name
  });

  const res2 = await fetch(lsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: ['/seaver@patricbrc.org/modelseed/Test/gapfilling/'] })
  });

  const files2 = await res2.json();
  console.log("\nFiles in /Test/gapfilling/:");
  Object.keys(files2).forEach(k => {
      files2[k].forEach(f => console.log(" - ", f[0]));
  });

  // check /seaver@patricbrc.org/modelseed/Test_Microbe/
  const res3 = await fetch(lsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths: ['/seaver@patricbrc.org/modelseed/Test_Microbe/'] })
  });
  if (res3.ok) {
     const f = await res3.json();
     if(Object.keys(f).length > 0) {
        console.log("Found Test_Microbe");
     }
  }

  // Fetch the actual gf object
  const gfRefReal = '/seaver@patricbrc.org/modelseed/Test/gapfilling/gf.0';
  let getUrl = `${API_URL}/api/workspace/get`;
  const resGet = await fetch(getUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ objects: [gfRefReal] })
  });
  
  if (resGet.ok) {
      const gfdataAll = await resGet.json();
      if (gfdataAll.length > 0 && gfdataAll[0]) {
         const gfdata = gfdataAll[0][1]; // 0 is meta, 1 is data usually in WS api? Or depends on API shape.
         console.log("\nReal object keys:", Object.keys(gfdata));
         if (gfdata.solution_reactions) {
             console.log("Real object has solution_reactions");
         } else {
             console.log("Real object NO solution_reactions");
         }
         if (gfdata.solutiondata) {
             console.log("Real object has solutiondata (typeof:", typeof gfdata.solutiondata, ")");
             console.log("Preview:", String(gfdata.solutiondata).slice(0, 100));
         } else {
             console.log("Real object NO solutiondata");
         }
      }
  } else {
      console.log("Raw get failed:", await resGet.text());
  }
}
checkIssues();
