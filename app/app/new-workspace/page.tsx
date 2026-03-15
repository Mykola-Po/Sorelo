import { cookies } from "next/headers";
import { Flex, Text } from "@radix-ui/themes";

import { CreateWorkspaceForm } from "@/features/workspace/components/create-workspace-form";
import { LOCALE_COOKIE, resolveSupportedLocale } from "@/shared/i18n/config";
import { getAppShellMessages } from "@/shared/i18n/messages/app-shell";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";

export default async function NewWorkspacePage() {
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const messages = getAppShellMessages(locale);

  return (
    <Flex direction="column" gap="5" className="page-stack">
      <PageHeader
        title={messages.newWorkspace.title}
        description={messages.newWorkspace.description}
      />
      <SectionCard
        title={messages.newWorkspace.detailsTitle}
        description={messages.newWorkspace.detailsDescription}
      >
        <CreateWorkspaceForm messages={messages.newWorkspace.form} />
      </SectionCard>
      <Text color="gray" size="2">
        {messages.newWorkspace.helperText}
      </Text>
    </Flex>
  );
}
