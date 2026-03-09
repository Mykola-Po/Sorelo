import { Flex, Text } from "@radix-ui/themes";

import { CreateWorkspaceForm } from "@/features/workspace/components/create-workspace-form";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";

export default function NewWorkspacePage() {
  return (
    <Flex direction="column" gap="5" className="page-stack">
      <PageHeader
        title="Create your first workspace"
        description="This is the only onboarding screen in the initial shell. Keep it fast, clear, and reversible."
      />
      <SectionCard
        title="Workspace details"
        description="Names stay human-readable. Slugs stay URL-safe."
      >
        <CreateWorkspaceForm />
      </SectionCard>
      <Text color="gray" size="2">
        The app shell stays fixed to the viewport. Once created, the workspace
        becomes the persistent operating context.
      </Text>
    </Flex>
  );
}
