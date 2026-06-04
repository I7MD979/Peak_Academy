import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".next");
fs.rmSync(dir, { recursive: true, force: true });
console.log("Removed .next cache");
