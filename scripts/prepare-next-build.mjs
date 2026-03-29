import { rmSync } from "node:fs";
import path from "node:path";

const nextDevArtifactsPath = path.join(process.cwd(), ".next", "dev");

rmSync(nextDevArtifactsPath, {
  recursive: true,
  force: true,
});
