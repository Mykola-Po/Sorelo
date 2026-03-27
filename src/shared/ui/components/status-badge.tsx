import { Badge } from "@radix-ui/themes";

type StatusBadgeProps = {
  status: string;
  label?: string;
};

const statusToColor: Record<
  string,
  "blue" | "green" | "orange" | "gray" | "red"
> = {
  active: "blue",
  archived: "gray",
  todo: "gray",
  in_progress: "orange",
  done: "green",
  owner: "blue",
  admin: "orange",
  editor: "green",
  viewer: "gray",
  thought: "blue",
  state: "orange",
  belief: "green",
  experience: "gray",
  fact: "blue",
  trigger: "red",
  custom: "gray",
  causes: "blue",
  strengthens: "green",
  weakens: "orange",
  explains: "gray",
  contradicts: "red",
  pending: "orange",
  running: "orange",
  completed: "green",
  failed: "red",
  accepted: "green",
  edited: "blue",
  rejected: "red",
  context_limited: "orange",
  split: "orange",
  merged: "green",
  retyped: "blue",
  relinked: "blue",
  confidence_changed: "blue",
  received: "blue",
  persisted: "blue",
  normalized: "blue",
  segmented: "blue",
  interpreted: "blue",
  scored: "blue",
  resolved: "blue",
  clarification_requested: "orange",
  promoted: "green",
  ready_for_review: "orange",
  park: "gray",
  parked: "gray",
  clarify: "orange",
  discard: "red",
  discarded: "red",
  applied: "green",
  failed_needs_review: "red",
  manual_note: "blue",
  manual_process: "blue",
  transcript: "gray",
  chat: "blue",
  upload: "gray",
  import: "gray",
  item_raw: "gray",
  clarification_answer: "orange",
  clarification_rerun: "orange",
  statement: "gray",
  question: "orange",
  constraint: "red",
  claim: "blue",
  observation: "green",
  intent: "blue",
  interpretation: "blue",
  candidate_structure: "gray",
  relation_cluster: "green",
  actionable_summary: "orange",
  concept_packet: "blue",
  link_packet: "green",
  mixed_packet: "blue",
  clarification_packet: "orange",
  parked_packet: "gray",
  inbox_review: "blue",
  not_applicable: "gray",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge color={statusToColor[status] ?? "gray"} radius="full" variant="soft">
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
