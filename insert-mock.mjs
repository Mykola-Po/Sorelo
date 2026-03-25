
import postgres from "postgres";

const DATABASE_URL = "postgresql://postgres.zjcgjmqisyltsbkxqakd:fCfaJ%2AYg%2FbYS8%24F@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

async function main() {
  const sql = postgres(DATABASE_URL);
  
  // Find a workspace and map
  const [workspace] = await sql`SELECT id, slug FROM workspaces LIMIT 1`;
  const [map] = await sql`SELECT id, slug FROM maps WHERE workspace_id = ${workspace.id} LIMIT 1`;
  const [user] = await sql`SELECT id FROM users LIMIT 1`;

  if (!workspace || !map || !user) {
    console.error("Missing workspace, map, or user");
    await sql.end();
    process.exit(1);
  }

  console.log(`Using workspace: ${workspace.slug} (${workspace.id}), map: ${map.slug} (${map.id})`);

  // Create a batch
  const [batch] = await sql`
    INSERT INTO learning.suggestion_batches 
    (workspace_id, map_id, initiated_by_user_id, batch_type, model_name, model_version, prompt_version, input_hash, status)
    VALUES 
    (${workspace.id}, ${map.id}, ${user.id}, 'extract', 'gpt-4o', '2024-05-13', 'v1', 'hash123', 'completed')
    RETURNING id
  `;

  // Create a suggestion
  await sql`
    INSERT INTO learning.suggestions 
    (batch_id, workspace_id, map_id, suggestion_type, target_entity_type, proposed_payload, rationale, confidence)
    VALUES 
    (${batch.id}, ${workspace.id}, ${map.id}, 'create_concept', 'concept', '{"title": "New Insight", "concept_type": "thought"}'::jsonb, 'This was extracted from the discussion about growth.', 0.95),
    (${batch.id}, ${workspace.id}, ${map.id}, 'create_link', 'link', '{"source_concept_id": "...", "target_concept_id": "...", "relation_type": "causes"}'::jsonb, 'Growth causes higher demand.', 0.85)
  `;

  console.log("Mock data inserted successfully");
  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
