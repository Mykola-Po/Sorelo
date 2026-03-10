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
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <Badge color={statusToColor[status] ?? "gray"} radius="full" variant="soft">
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
