import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const backupDir = process.env.REPO_BACKUP_DIR ?? "backups";
const now = new Date().toISOString().replace(/[.:]/g, "-");
const bundlePath = join(backupDir, `sorela-${now}.bundle`);

mkdirSync(backupDir, { recursive: true });

execFileSync("git", ["bundle", "create", bundlePath, "--all"], {
  stdio: "inherit",
});

console.log(`Backup created: ${bundlePath}`);
