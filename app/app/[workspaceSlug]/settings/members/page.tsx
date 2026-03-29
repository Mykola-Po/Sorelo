import { MemberRoleForm } from "@/features/workspace/components/member-role-form";
import { listWorkspaceMembers } from "@/features/workspace/queries";
import { requireWorkspaceAccess } from "@/shared/auth/session";
import { DataTable } from "@/shared/ui/components/data-table";
import { PageHeader } from "@/shared/ui/components/page-header";
import { SectionCard } from "@/shared/ui/components/section-card";
import { StatusBadge } from "@/shared/ui/components/status-badge";
import { WorkspaceSectionNav } from "@/features/workspace/components/workspace-section-nav";

type MembersPageProps = {
  params: Promise<{
    workspaceSlug: string;
  }>;
};

export default async function MembersPage({ params }: MembersPageProps) {
  const { workspaceSlug } = await params;
  const { access } = await requireWorkspaceAccess(workspaceSlug);
  const members = await listWorkspaceMembers(access.workspace.id);

  return (
    <div className="page-stack">
      <WorkspaceSectionNav
        workspaceSlug={workspaceSlug}
        currentSection="members"
      />
      <PageHeader
        title="Members"
        description="Role updates stay inside the workspace context and do not push you into a separate admin product."
      />
      <SectionCard
        title="Workspace members"
        description="Role changes are inline and bounded to the table surface."
      >
        <div className="table-scroll">
          <DataTable
            columns={["User", "Role", "Joined", "Change role"]}
            rows={members.map((member) => [
              `${member.fullName ?? "Unnamed"} (${member.email})`,
              <StatusBadge key={`${member.userId}-role`} status={member.role} />,
              member.joinedAt.toLocaleDateString(),
              <MemberRoleForm
                key={`${member.userId}-form`}
                workspaceSlug={workspaceSlug}
                userId={member.userId}
                currentRole={member.role}
                actorRole={access.role}
              />,
            ])}
          />
        </div>
      </SectionCard>
    </div>
  );
}
