import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Read cached user from localStorage synchronously so we never flash the
// loading spinner on a page refresh when the user is already logged in.
function getCachedUser() {
  try {
    const raw = localStorage.getItem("jp-auth-user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Seed the cache with whatever is in localStorage — this means isLoading
    // starts as false if we already have a cached user, eliminating the flash.
    initialData: getCachedUser(),
    // Keep the result fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("jp-auth-user");
      utils.auth.me.setData(undefined, undefined);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      localStorage.removeItem("jp-auth-user");
      utils.auth.me.setData(undefined, undefined);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (meQuery.data !== undefined) {
      if (meQuery.data) {
        localStorage.setItem("jp-auth-user", JSON.stringify(meQuery.data));
      } else {
        localStorage.removeItem("jp-auth-user");
      }
    }
  }, [meQuery.data]);

  const state = useMemo(() => {
    // Only show the full-page loading spinner on the very first load when we
    // have no cached data at all. Background refetches should be invisible.
    const hasNoCache = meQuery.data === undefined && !meQuery.isFetched;
    return {
      user: meQuery.data ?? null,
      loading: hasNoCache || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isFetched,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
