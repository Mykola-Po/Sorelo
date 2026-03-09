import { cookies } from "next/headers";

import { listWorkspacesForUser } from "@/features/workspace/queries";
import { requireUser } from "@/shared/auth/session";
import { ACTIVE_WORKSPACE_COOKIE } from "@/shared/config/routes";
import { ProductShell } from "@/shared/ui/shells/product-shell";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const workspaces = await listWorkspacesForUser(user.id);
  const cookieStore = await cookies();
  const activeWorkspaceSlug =
    cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? workspaces[0]?.slug;

  return (
    <ProductShell
      user={{ fullName: user.fullName, email: user.email }}
      workspaces={workspaces}
      activeWorkspaceSlug={activeWorkspaceSlug ?? undefined}
    >
      {children}
    </ProductShell>
  );
}
