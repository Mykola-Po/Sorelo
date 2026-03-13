import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { findDocsHubDocument } from "@/features/docs-hub/manifest";

export type MarkdownInlinePart =
  | { type: "text"; value: string }
  | { type: "code"; value: string };

export type MarkdownBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
      id: string;
    }
  | {
      type: "paragraph";
      parts: MarkdownInlinePart[];
    }
  | {
      type: "list";
      ordered: boolean;
      items: MarkdownInlinePart[][];
    };

export type ParsedMarkdownDocument = {
  title: string;
  blocks: MarkdownBlock[];
  headings: Array<{
    id: string;
    level: 2 | 3;
    text: string;
  }>;
};

export async function loadParsedDocsHubDocument(documentId: string) {
  const document = await findDocsHubDocument(documentId);

  if (!document || !document.path) {
    return null;
  }

  const absolutePath = path.join(process.cwd(), document.path);
  const markdown = await fs.readFile(absolutePath, "utf8");

  return {
    document,
    content: parseMarkdown(markdown),
  };
}

function parseMarkdown(markdown: string): ParsedMarkdownDocument {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  const headings: ParsedMarkdownDocument["headings"] = [];
  let index = 0;
  let title = "Document";

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";

    if (!line) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const hashes = headingMatch[1] ?? "#";
      const headingText = headingMatch[2] ?? "";
      const level = hashes.length as 1 | 2 | 3;
      const text = headingText.trim();
      const id = slugify(text);

      if (level === 1) {
        title = text;
      }

      blocks.push({
        type: "heading",
        level,
        text,
        id,
      });

      if (level === 2 || level === 3) {
        headings.push({
          id,
          level,
          text,
        });
      }

      index += 1;
      continue;
    }

    const unorderedListMatch = /^-\s+(.+)$/.exec(line);
    const orderedListMatch = /^(\d+)\.\s+(.+)$/.exec(line);

    if (unorderedListMatch || orderedListMatch) {
      const ordered = Boolean(orderedListMatch);
      const items: MarkdownInlinePart[][] = [];

      while (index < lines.length) {
        const currentLine = lines[index]?.trim() ?? "";
        const currentUnordered = /^-\s+(.+)$/.exec(currentLine);
        const currentOrdered = /^(\d+)\.\s+(.+)$/.exec(currentLine);

        if (ordered) {
          if (!currentOrdered) {
            break;
          }

          items.push(parseInlineMarkdown((currentOrdered[2] ?? "").trim()));
          index += 1;
          continue;
        }

        if (!currentUnordered) {
          break;
        }

        items.push(parseInlineMarkdown((currentUnordered[1] ?? "").trim()));
        index += 1;
      }

      blocks.push({
        type: "list",
        ordered,
        items,
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const currentLine = lines[index]?.trim() ?? "";

      if (
        !currentLine ||
        /^(#{1,3})\s+/.test(currentLine) ||
        /^-\s+/.test(currentLine) ||
        /^\d+\.\s+/.test(currentLine)
      ) {
        break;
      }

      paragraphLines.push(currentLine);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        parts: parseInlineMarkdown(paragraphLines.join(" ")),
      });
      continue;
    }

    index += 1;
  }

  return {
    title,
    blocks,
    headings,
  };
}

function parseInlineMarkdown(text: string): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = [];
  const matches = text.matchAll(/`([^`]+)`/g);
  let currentIndex = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > currentIndex) {
      parts.push({
        type: "text",
        value: text.slice(currentIndex, matchIndex),
      });
    }

    parts.push({
      type: "code",
      value: match[1] ?? "",
    });

    currentIndex = matchIndex + match[0].length;
  }

  if (currentIndex < text.length) {
    parts.push({
      type: "text",
      value: text.slice(currentIndex),
    });
  }

  return parts.length > 0
    ? parts
    : [
        {
          type: "text",
          value: text,
        },
      ];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
