import { syncAllTeamMembers } from '../src/services/teamService';

async function run() {
  console.log("Starting benchmark...");
  let times = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await syncAllTeamMembers();
    const end = Date.now();
    times.push(end - start);
    console.log(`Run ${i+1}: syncAllTeamMembers took ${end - start} ms`);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`Average time: ${avg.toFixed(2)} ms`);
  process.exit(0);
}

run().catch(console.error);
