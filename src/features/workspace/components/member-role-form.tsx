"use client";

import { useActionState } from "react";
import { Flex, Select, Text } from "@radix-ui/themes";

import { updateMemberRoleAction } from "@/features/workspace/actions";
import { canManageMembers } from "@/shared/auth/policies";
import {
  FormErrorMessage,
  SubmitButton,
} from "@/shared/ui/components/form-controls";
import type { ActionState } from "@/shared/validation/action-state";
import type { WorkspaceRole } from "@/shared/db/schema";

const initialState: ActionState<"role"> = { status: "idle" };

type MemberRoleFormProps = {
  workspaceSlug: string;
  userId: string;
  currentRole: WorkspaceRole;
  actorRole: WorkspaceRole;
};

export function MemberRoleForm({
  workspaceSlug,
  userId,
  currentRole,
  actorRole,
}: MemberRoleFormProps) {
  const [state, formAction] = useActionState(
    updateMemberRoleAction,
    initialState
  );

  if (currentRole === "owner") {
    return <Text size="2">Owner</Text>;
  }

  if (!canManageMembers(actorRole)) {
    return <Text size="2">{currentRole}</Text>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="userId" value={userId} />
      <Flex direction="column" gap="2">
        <Select.Root name="role" defaultValue={currentRole}>
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="admin">Admin</Select.Item>
            <Select.Item value="editor">Editor</Select.Item>
            <Select.Item value="viewer">Viewer</Select.Item>
          </Select.Content>
        </Select.Root>
        <SubmitButton size="1" variant="soft" color="gray">
          Update role
        </SubmitButton>
        <FormErrorMessage message={state.message} size="1" />
      </Flex>
    </form>
  );
}
