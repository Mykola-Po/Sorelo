import fs from "node:fs";
import path from "node:path";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 48;
const RIGHT = 48;
const TOP = 44;
const BOTTOM = 42;

const outputPath = path.resolve("output/pdf/sorelo-app-summary.pdf");

let y = PAGE_HEIGHT - TOP;
const commands = [];

function escapePdfText(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function estimateWidth(text, fontSize) {
  let units = 0;

  for (const ch of text) {
    if (ch === " ") {
      units += 0.28;
      continue;
    }

    if ("il.,:;|!'`".includes(ch)) {
      units += 0.24;
      continue;
    }

    if ("MW@#%&".includes(ch)) {
      units += 0.9;
      continue;
    }

    if (/[A-Z0-9]/.test(ch)) {
      units += 0.62;
      continue;
    }

    units += 0.52;
  }

  return units * fontSize;
}

function wrapText(text, maxWidth, fontSize) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const nextChunk = `${chunk}${char}`;
      if (estimateWidth(nextChunk, fontSize) <= maxWidth) {
        chunk = nextChunk;
      } else {
        if (chunk) {
          lines.push(chunk);
        }
        chunk = char;
      }
    }

    current = chunk;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawLine(text, x, fontSize) {
  const safe = escapePdfText(text);
  commands.push(
    `BT /F1 ${fontSize.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET`
  );
}

function ensureSpace(required) {
  if (y - required < BOTTOM) {
    throw new Error("Content overflowed the single page.");
  }
}

function addTitle(text) {
  const fontSize = 20;
  const leading = 24;
  ensureSpace(leading);
  drawLine(text, LEFT, fontSize);
  y -= leading;
}

function addSubtitle(text) {
  const fontSize = 9;
  const leading = 13;
  ensureSpace(leading);
  drawLine(text, LEFT, fontSize);
  y -= leading;
}

function addHeading(text) {
  y -= 7;
  const fontSize = 12;
  const leading = 15;
  ensureSpace(leading);
  drawLine(text, LEFT, fontSize);
  y -= leading;
}

function addParagraph(text) {
  const fontSize = 9.6;
  const leading = 12;
  const width = PAGE_WIDTH - LEFT - RIGHT;
  const lines = wrapText(text, width, fontSize);
  ensureSpace(lines.length * leading);
  for (const line of lines) {
    drawLine(line, LEFT, fontSize);
    y -= leading;
  }
}

function addBullet(text) {
  const fontSize = 9.4;
  const leading = 11;
  const bulletIndent = 11;
  const textIndent = 22;
  const width = PAGE_WIDTH - RIGHT - textIndent;
  const lines = wrapText(text, width, fontSize);
  if (lines.length === 0) {
    return;
  }

  ensureSpace(lines.length * leading);
  drawLine("- ", LEFT + bulletIndent, fontSize);
  drawLine(lines[0], LEFT + textIndent, fontSize);
  y -= leading;
  for (let index = 1; index < lines.length; index += 1) {
    drawLine(lines[index], LEFT + textIndent, fontSize);
    y -= leading;
  }
}

function addGap(space = 4) {
  ensureSpace(space);
  y -= space;
}

addTitle("Sorelo App Summary");
addSubtitle("One-page repo-based brief | Generated on 2026-03-10");

addHeading("What It Is");
addParagraph(
  "Sorelo is a Next.js app for building an explainable map of a person with Concepts, Links, the Inspector, and deterministic Scenarios."
);
addParagraph(
  "It combines a canvas-first interface with workspace tenancy so users can model, inspect, and test reaction paths."
);

addHeading("Who It Is For");
addBullet(
  "Primary persona: people who need a structured, explainable model of a person instead of fragmented observations."
);
addBullet("Specific profession or industry persona: Not found in repo.");

addHeading("What It Does");
addBullet("Supports Google OAuth sign-in via Supabase plus workspace-based access control.");
addBullet("Creates and manages workspaces and multiple maps per workspace.");
addBullet("Provides map canvas editing: create concepts, connect links, and drag concept positions.");
addBullet("Shows Inspector details for selected concepts and links, including editable metadata.");
addBullet("Runs deterministic scenario simulations and persists step-by-step run results.");
addBullet("Shows recent scenario runs and map-level activity context inside the product shell.");
addBullet("Exposes protected internal learning APIs for suggestions, fragments, and resolutions.");

addHeading("How It Works (Architecture)");
addBullet(
  "Components: Next.js App Router pages (`app/`), `ProductShell`/`MarketingShell`, `MapWorkspace`, `GraphCanvasRuntime`, `InspectorPanel`, and `ScenarioPanel`."
);
addBullet(
  "Services: route handlers in `app/api/maps/*` and `app/api/internal/learning/*` with Zod validation and access checks."
);
addBullet(
  "Domain layer: `src/features/*/commands.ts` and `queries.ts` modules implement map, concept, link, scenario, workspace, and learning behavior."
);
addBullet(
  "Data/auth: Supabase SSR auth plus session sync into Postgres via Drizzle ORM; schema and migrations live in `src/shared/db/schema.ts` and `supabase/migrations/`."
);
addBullet(
  "Data flow: browser requests viewport snapshots from `/api/maps/:mapId/graph`; mutation routes update entities and graph revision; scenario runs use a rule-based engine and write `scenario_runs` + `scenario_run_steps`."
);

addHeading("How To Run (Minimal)");
addBullet("Install dependencies: `npm install` (or `npm.cmd install` on restricted PowerShell setups).");
addBullet("Create local env file from `.env.example` to `.env.local` and fill required keys.");
addBullet("Start the dev server with `npm run dev`.");
addBullet("Open `http://localhost:3000` and sign in with Google.");
addBullet(
  "First-time local database bootstrap/migration command: Not found in repo (scripts list `db:generate` and `db:check`)."
);

addGap(2);
drawLine("Evidence source: README.md, docs/product/*, app/*, src/features/*, src/shared/*, supabase/migrations/*.", LEFT, 8.4);

const streamContent = commands.join("\n");
const streamLength = Buffer.byteLength(streamContent, "utf8");

const objects = [
  null,
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [0];

for (let id = 1; id < objects.length; id += 1) {
  offsets[id] = Buffer.byteLength(pdf, "utf8");
  pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
}

const xrefStart = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length}\n`;
pdf += "0000000000 65535 f \n";

for (let id = 1; id < objects.length; id += 1) {
  const offset = String(offsets[id]).padStart(10, "0");
  pdf += `${offset} 00000 n \n`;
}

pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, pdf, "binary");

console.log(outputPath);
