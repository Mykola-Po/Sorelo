
import { db } from "./src/shared/db/client";
import { workspaces, maps, users } from "./src/shared/db/schema";

async function main() {
  const allWorkspaces = await db.select().from(workspaces);
  const allMaps = await db.select().from(maps);
  const allUsers = await db.select().from(users);
  
  console.log("DATA_START");
  console.log(JSON.stringify({
    workspaces: allWorkspaces.map(w => ({ id: w.id, slug: w.slug })),
    maps: allMaps.map(m => ({ id: m.id, workspaceId: m.workspaceId, slug: m.slug })),
    users: allUsers.map(u => ({ id: u.id, email: u.email }))
  }, null, 2));
  console.log("DATA_END");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
