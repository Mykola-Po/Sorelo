"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

type AuthState = {
  loading: boolean;
  user: User | null;
  error: string | null;
};

async function ensureProfile(user: User): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export function AuthPanel() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    error: null
  });

  const supabaseInit = useMemo(() => {
    try {
      return { client: getSupabaseBrowserClient(), initError: null as string | null };
    } catch (error) {
      return {
        client: null,
        initError: error instanceof Error ? error.message : "Supabase client init failed."
      };
    }
  }, []);
  const supabase = supabaseInit.client;

  useEffect(() => {
    if (!supabase) {
      setState({
        loading: false,
        user: null,
        error: supabaseInit.initError ?? "Supabase client init failed."
      });
      return;
    }

    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setState({ loading: false, user: null, error: error.message });
        return;
      }

      const session: Session | null = data.session;
      setState({ loading: false, user: session?.user ?? null, error: null });

      if (session?.user) {
        try {
          await ensureProfile(session.user);
        } catch (profileError) {
          if (!mounted) return;
          setState((prev) => ({
            ...prev,
            error: profileError instanceof Error ? profileError.message : "Profile sync failed."
          }));
        }
      }
    };

    void syncSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ loading: false, user: session?.user ?? null, error: null });
      if (session?.user) {
        void ensureProfile(session.user).catch((profileError) => {
          setState((prev) => ({
            ...prev,
            error: profileError instanceof Error ? profileError.message : "Profile sync failed."
          }));
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, supabaseInit.initError]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const redirectTo = (appUrl && appUrl.length > 0 ? appUrl : window.location.origin).replace(/\/+$/, "");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
      return;
    }
    setState({ loading: false, user: null, error: null });
  };

  return (
    <section>
      <h2>Authentication</h2>
      {state.loading && <p>Checking session...</p>}
      {!state.loading && !state.user && <p>Not signed in.</p>}
      {!state.loading && state.user && <p>Signed in as {state.user.email ?? state.user.id}</p>}
      {state.error && <p>Auth error: {state.error}</p>}
      {!state.user ? (
        <button type="button" onClick={signInWithGoogle}>Sign in with Google</button>
      ) : (
        <button type="button" onClick={signOut}>Sign out</button>
      )}
    </section>
  );
}
