export function normalizeMapSlug(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "map";
}

export function fallbackMapTitleFromSituation(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "Untitled scenario";
  }

  return trimmed.slice(0, 80);
}
