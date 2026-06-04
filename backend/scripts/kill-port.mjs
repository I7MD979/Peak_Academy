import { execSync } from "node:child_process";

const port = process.argv[2] || "4000";

try {
  const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const match = line.match(/LISTENING\s+(\d+)/);
    if (match) pids.add(match[1]);
  }
  if (pids.size === 0) {
    console.log(`No listener on port ${port}`);
    process.exit(0);
  }
  for (const pid of pids) {
    execSync(`taskkill /PID ${pid} /F`);
    console.log(`Stopped PID ${pid} on port ${port}`);
  }
} catch {
  console.log(`No listener on port ${port}`);
}
