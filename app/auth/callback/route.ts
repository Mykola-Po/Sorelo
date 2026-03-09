import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  countWorkspacesForUser,
  getLastActiveWorkspaceForUser,
} from "@/features/workspace/queries";
import { createServerSupabaseClient } from "@/shared/auth/supabase/server";
import { syncAuthenticatedUser } from "@/shared/auth/session";
import { ACTIVE_WORKSPACE_COOKIE } from "@/shared/config/routes";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const user = await syncAuthenticatedUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const workspaceCount = await countWorkspacesForUser(user.id);

  if (workspaceCount === 0) {
    return NextResponse.redirect(new URL("/app/new-workspace", request.url));
  }

  const lastActiveWorkspace = await getLastActiveWorkspaceForUser(user.id);
  if (lastActiveWorkspace) {
    return NextResponse.redirect(
      new URL(`/app/${lastActiveWorkspace.slug}`, request.url)
    );
  }

  const cookieStore = await cookies();
  const preferredWorkspace = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (preferredWorkspace) {
    return NextResponse.redirect(
      new URL(`/app/${preferredWorkspace}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/app", request.url));
}
