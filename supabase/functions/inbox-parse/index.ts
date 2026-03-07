import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type InboxRequest = {
  text: string;
};

const lineBreakRegex = /\r?\n/;

function extractCandidates(input: string): string[] {
  const lines = input
    .split(lineBreakRegex)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const bulletLike = lines.filter((line) => /^[-*\d.\)]\s*/.test(line)).map((line) => line.replace(/^[-*\d.\)]\s*/, "").trim());
  const base = bulletLike.length > 0 ? bulletLike : lines;

  return base
    .flatMap((line) => line.split(/[.;!?]/g))
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .slice(0, 12);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as InboxRequest;
    const text = body.text?.trim() ?? "";

    if (!text) {
      return Response.json({ items: [] });
    }

    const items = extractCandidates(text);
    return Response.json({ items });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
});