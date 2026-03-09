"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "@radix-ui/themes";

import { switchActiveWorkspaceAction } from "@/features/workspace/actions";

type WorkspaceSwitcherProps = {
  workspaces: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  activeWorkspaceSlug?: string | undefined;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceSlug,
}: WorkspaceSwitcherProps) {
  const initialValue = activeWorkspaceSlug ?? workspaces[0]?.slug ?? "";
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] =
    useState(initialValue);

  useEffect(() => {
    setSelectedWorkspaceSlug(initialValue);
  }, [initialValue]);

  if (!initialValue) {
    return null;
  }

  return (
    <form ref={formRef} action={switchActiveWorkspaceAction}>
      <input
        ref={hiddenInputRef}
        type="hidden"
        name="workspaceSlug"
        value={selectedWorkspaceSlug}
        readOnly
      />
      <Select.Root
        size="1"
        value={selectedWorkspaceSlug}
        onValueChange={(nextWorkspaceSlug) => {
          setSelectedWorkspaceSlug(nextWorkspaceSlug);
          if (hiddenInputRef.current) {
            hiddenInputRef.current.value = nextWorkspaceSlug;
          }
          formRef.current?.requestSubmit();
        }}
      >
        <Select.Trigger />
        <Select.Content>
          {workspaces.map((workspace) => (
            <Select.Item key={workspace.id} value={workspace.slug}>
              {workspace.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </form>
  );
}
