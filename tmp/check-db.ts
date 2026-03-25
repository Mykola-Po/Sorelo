
import { db } from "./src/shared/db/client.ts";
import { workspaces, maps } from "./src/shared/db/schema.ts";

async function main() {
  const allWorkspaces = await db.select().from(workspaces);
  const allMaps = await db.select().from(maps);
  console.log("Workspaces:", allWorkspaces);
  console.log("Maps:", allMaps);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
