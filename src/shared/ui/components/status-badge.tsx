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
  member: "gray",
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
  completed: "green",
  failed: "red",
  received: "blue",
  persisted: "blue",
  normalized: "blue",
  segmented: "blue",
  interpreted: "blue",
  scored: "blue",
  resolved: "blue",
  clarification_requested: "orange",
  promoted: "green",
  park: "gray",
  parked: "gray",
  clarify: "orange",
  discard: "red",
  discarded: "red",
  failed_needs_review: "red",
  manual_note: "blue",
  transcript: "gray",
  chat: "blue",
  upload: "gray",
  import: "gray",
  item_raw: "gray",
  clarification_answer: "orange",
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
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge color={statusToColor[status] ?? "gray"} radius="full" variant="soft">
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
