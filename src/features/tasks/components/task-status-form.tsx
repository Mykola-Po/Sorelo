import { Button, Flex } from "@radix-ui/themes";

import { updateTaskStatusAction } from "@/features/tasks/actions";

type TaskStatusFormProps = {
  workspaceSlug: string;
  projectId: string;
  taskId: string;
  currentStatus: "todo" | "in_progress" | "done";
};

const options: Array<{
  value: "todo" | "in_progress" | "done";
  label: string;
}> = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function TaskStatusForm({
  workspaceSlug,
  projectId,
  taskId,
  currentStatus,
}: TaskStatusFormProps) {
  return (
    <Flex gap="2" wrap="wrap">
      {options.map((option) => (
        <form action={updateTaskStatusAction} key={option.value}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="status" value={option.value} />
          <Button
            type="submit"
            size="1"
            variant={currentStatus === option.value ? "solid" : "soft"}
            color={currentStatus === option.value ? "blue" : "gray"}
          >
            {option.label}
          </Button>
        </form>
      ))}
    </Flex>
  );
}
