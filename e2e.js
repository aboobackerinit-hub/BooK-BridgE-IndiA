const axios = require('axios');

async function runTests(backendUrl, frontendUrl) {
  console.log(`Starting E2E Validation...`);
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`[FAIL] ${name}: ${e.message}`);
      failed++;
    }
  };

  await test("Backend starts successfully", async () => {
    const res = await axios.get(`${backendUrl}/api/v1/health`);
    if (res.status !== 200) throw new Error("Health check failed");
  });

  await test("Frontend deployed successfully", async () => {
    const res = await axios.get(frontendUrl);
    if (res.status !== 200) throw new Error("Frontend not reachable");
  });

  // More API tests would go here depending on the live backend
  
  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node e2e.js <backend_url> <frontend_url>");
  process.exit(1);
}

runTests(args[0], args[1]);
