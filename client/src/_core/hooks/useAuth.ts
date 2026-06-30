import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useRef, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

// Read cached user from localStorage synchronously — used as initialData
// so the query starts with data and never triggers a loading flash.
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

  // Track whether we've ever successfully confirmed auth from the server.
  // This prevents flashing "not authenticated" during the initial network check
  // when we have a cached user.
  const serverConfirmedRef = useRef<boolean | null>(null);
  const cachedUser = useRef(getCachedUser());

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Seed with localStorage so isLoading starts as false
    initialData: cachedUser.current,
    // Keep fresh for 5 minutes — avoids redundant network calls
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("jp-auth-user");
      serverConfirmedRef.current = false;
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
      serverConfirmedRef.current = false;
      utils.auth.me.setData(undefined, undefined);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  // Update localStorage and server-confirmed ref when query settles
  useEffect(() => {
    if (meQuery.isFetched) {
      serverConfirmedRef.current = Boolean(meQuery.data);
      if (meQuery.data) {
        localStorage.setItem("jp-auth-user", JSON.stringify(meQuery.data));
      } else {
        localStorage.removeItem("jp-auth-user");
      }
    }
  }, [meQuery.data, meQuery.isFetched]);

  const state = useMemo(() => {
    const hasCachedUser = Boolean(cachedUser.current);
    const serverData = meQuery.data;

    // Determine the effective user:
    // - If server has responded, trust the server result
    // - If server hasn't responded yet but we have a cache, use the cache
    //   (prevents flash while the background refetch is in flight)
    const effectiveUser = meQuery.isFetched
      ? (serverData ?? null)
      : (serverData ?? cachedUser.current ?? null);

    // Only show loading spinner when:
    // 1. We have NO cached data at all (truly first visit / logged out)
    // 2. AND the server hasn't responded yet
    const showLoading =
      !hasCachedUser && !meQuery.isFetched && !logoutMutation.isPending
        ? meQuery.isLoading
        : logoutMutation.isPending;

    return {
      user: effectiveUser,
      loading: showLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(effectiveUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    meQuery.isFetched,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    // Only redirect after the server has confirmed — never redirect based on
    // stale cache alone, and never redirect while loading
    if (!meQuery.isFetched) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isFetched,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
