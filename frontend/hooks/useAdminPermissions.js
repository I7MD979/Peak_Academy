"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "@/lib/api";

// Module-level cache so the hook doesn't re-fetch on every mount
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export function clearAdminPermissionsCache() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Returns the current admin/supervisor's permissions and a `can(permission)` helper.
 * Admins always return can() === true for everything.
 */
export function useAdminPermissions() {
  const [state, setState] = useState({ permissions: null, isAdmin: false });

  const load = useCallback(async () => {
    const now = Date.now();
    if (_cache && now - _cacheAt < CACHE_TTL) {
      setState(_cache);
      return;
    }

    try {
      const res = await dashboardApi.getMyPermissions();
      const data = res?.data || {};
      const next = {
        permissions: data.permissions || [],
        isAdmin: !!data.is_admin
      };
      _cache = next;
      _cacheAt = now;
      setState(next);
    } catch {
      setState({ permissions: [], isAdmin: false });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const can = useCallback((permission) => {
    if (state.isAdmin) return true;
    if (!state.permissions) return false;
    return state.permissions.includes(permission) || state.permissions.includes("admin.all");
  }, [state]);

  return {
    permissions: state.permissions,
    isAdmin: state.isAdmin,
    loading: state.permissions === null,
    can,
    refresh: load
  };
}
