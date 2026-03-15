type ChangePairKeys = {
  before: string;
  after: string;
};

const changePairCandidates: readonly ChangePairKeys[] = [
  { before: "before", after: "after" },
  { before: "from", after: "to" },
  { before: "old", after: "new" },
  { before: "previous", after: "next" },
  { before: "current", after: "proposed" },
];

const knownFieldLabels: Record<string, string> = {
  title: "Title",
  summary: "Summary",
  description: "Description",
  conceptType: "Concept type",
  relationType: "Relation type",
  strength: "Strength",
  sourceConceptId: "Source Concept",
  targetConceptId: "Target Concept",
  situation: "Situation",
  seedConceptIds: "Seed Concepts",
  targetEntityId: "Target entity",
};

export type LearningReviewDiffEntry = {
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  changeKind: "add" | "update" | "remove";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function readProperty(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function buildEntry(
  fieldPath: string,
  beforeValue: unknown,
  afterValue: unknown
): LearningReviewDiffEntry {
  if (beforeValue === undefined) {
    return {
      fieldPath,
      beforeValue,
      afterValue,
      changeKind: "add",
    };
  }

  if (afterValue === undefined) {
    return {
      fieldPath,
      beforeValue,
      afterValue,
      changeKind: "remove",
    };
  }

  return {
    fieldPath,
    beforeValue,
    afterValue,
    changeKind: "update",
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function extractPair(record: Record<string, unknown>) {
  for (const candidate of changePairCandidates) {
    if (
      Object.prototype.hasOwnProperty.call(record, candidate.before) &&
      Object.prototype.hasOwnProperty.call(record, candidate.after)
    ) {
      return {
        beforeValue: readProperty(record, candidate.before),
        afterValue: readProperty(record, candidate.after),
      };
    }
  }

  return null;
}

function diffObjectSnapshots(
  beforeRecord: Record<string, unknown>,
  afterRecord: Record<string, unknown>,
  pathPrefix = ""
): LearningReviewDiffEntry[] {
  const keys = Array.from(
    new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])
  );

  const entries: LearningReviewDiffEntry[] = [];

  for (const key of keys) {
    const beforeValue = readProperty(beforeRecord, key);
    const afterValue = readProperty(afterRecord, key);
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (isRecord(beforeValue) && isRecord(afterValue)) {
      const nestedEntries = diffObjectSnapshots(
        beforeValue,
        afterValue,
        fieldPath
      );

      if (nestedEntries.length > 0) {
        entries.push(...nestedEntries);
        continue;
      }
    }

    if (valuesEqual(beforeValue, afterValue)) {
      continue;
    }

    entries.push(buildEntry(fieldPath, beforeValue, afterValue));
  }

  return entries;
}

function collectSetEntries(
  value: unknown,
  fieldPath: string
): LearningReviewDiffEntry[] {
  if (isRecord(value)) {
    const directPair = extractPair(value);
    if (directPair) {
      return [
        buildEntry(fieldPath, directPair.beforeValue, directPair.afterValue),
      ];
    }

    const beforeSnapshot = readProperty(value, "before");
    const afterSnapshot = readProperty(value, "after");
    if (isRecord(beforeSnapshot) && isRecord(afterSnapshot)) {
      const snapshotEntries = diffObjectSnapshots(
        beforeSnapshot,
        afterSnapshot,
        fieldPath
      );

      if (snapshotEntries.length > 0) {
        return snapshotEntries;
      }
    }

    const nestedEntries: LearningReviewDiffEntry[] = [];

    for (const [key, nestedValue] of Object.entries(value)) {
      nestedEntries.push(
        ...collectSetEntries(nestedValue, `${fieldPath}.${key}`)
      );
    }

    return nestedEntries;
  }

  return [buildEntry(fieldPath, undefined, value)];
}

function normalizeEntries(entries: LearningReviewDiffEntry[]) {
  const entriesByPath = new Map<string, LearningReviewDiffEntry>();

  for (const entry of entries) {
    entriesByPath.set(entry.fieldPath, entry);
  }

  return [...entriesByPath.values()].sort((left, right) =>
    left.fieldPath.localeCompare(right.fieldPath)
  );
}

export function deriveLearningReviewDiff(
  proposedPayload: Record<string, unknown>
): LearningReviewDiffEntry[] {
  const beforeSnapshot = readProperty(proposedPayload, "before");
  const afterSnapshot = readProperty(proposedPayload, "after");

  if (isRecord(beforeSnapshot) && isRecord(afterSnapshot)) {
    return normalizeEntries(diffObjectSnapshots(beforeSnapshot, afterSnapshot));
  }

  const beforePayload = readProperty(proposedPayload, "beforePayload");
  const afterPayload = readProperty(proposedPayload, "afterPayload");

  if (isRecord(beforePayload) && isRecord(afterPayload)) {
    return normalizeEntries(diffObjectSnapshots(beforePayload, afterPayload));
  }

  const changes = readProperty(proposedPayload, "changes");
  if (isRecord(changes)) {
    const changeEntries: LearningReviewDiffEntry[] = [];

    for (const [key, value] of Object.entries(changes)) {
      changeEntries.push(...collectSetEntries(value, key));
    }

    if (changeEntries.length > 0) {
      return normalizeEntries(changeEntries);
    }
  }

  const fallbackEntries: LearningReviewDiffEntry[] = [];

  for (const [key, value] of Object.entries(proposedPayload)) {
    if (
      key === "before" ||
      key === "after" ||
      key === "beforePayload" ||
      key === "afterPayload" ||
      key === "changes"
    ) {
      continue;
    }

    fallbackEntries.push(...collectSetEntries(value, key));
  }

  return normalizeEntries(fallbackEntries);
}

function humanizeToken(token: string) {
  return token
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function humanizeLearningFieldPath(fieldPath: string) {
  const byExactPath = knownFieldLabels[fieldPath];
  if (byExactPath) {
    return byExactPath;
  }

  const segments = fieldPath.split(".").filter(Boolean);
  if (segments.length === 0) {
    return "Field";
  }

  const lastSegment = segments[segments.length - 1];
  if (!lastSegment) {
    return "Field";
  }

  const byLastSegment = knownFieldLabels[lastSegment];
  if (byLastSegment) {
    return byLastSegment;
  }

  return segments.map(humanizeToken).join(" / ");
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function formatPrimitive(value: string | number | boolean | null) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value.length > 0 ? value : "\"\"";
  }

  return String(value);
}

export function formatLearningDiffValue(value: unknown) {
  if (value === undefined) {
    return "-";
  }

  if (isPrimitive(value)) {
    return formatPrimitive(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    if (value.every(isPrimitive)) {
      return value.map(formatPrimitive).join(", ");
    }
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return "{}";
    }

    if (serialized.length > 200) {
      return `${serialized.slice(0, 197)}...`;
    }

    return serialized;
  } catch {
    return String(value);
  }
}
