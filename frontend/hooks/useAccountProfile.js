"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { profileFromAuthUser } from "@/lib/auth-user-profile";
import { validateBaseProfile } from "@/lib/profile-form";
import { useAuth } from "@/hooks/useAuth";
import { notifyProfileUpdated } from "@/hooks/useSidebarProfile";

export function useAccountProfile({ autoLoad = true } = {}) {
  const { user: authUser, session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isAuthFallback, setIsAuthFallback] = useState(false);

  const applyUser = useCallback((user) => {
    setProfile(user);
    setForm({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      avatar_url: user?.avatar_url || ""
    });
  }, []);

  const accessToken = session?.access_token;

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setIsAuthFallback(false);
    try {
      const res = await authApi.me(accessToken);
      const user = res?.data || null;
      if (user) {
        applyUser(user);
        return;
      }
      throw new Error("تعذر تحميل الملف الشخصي");
    } catch (err) {
      const fallback = profileFromAuthUser(authUser);
      if (fallback) {
        applyUser(fallback);
        setIsAuthFallback(true);
        setError("");
      } else {
        setProfile(null);
        setError(err.message || "تعذر تحميل الملف الشخصي");
      }
    } finally {
      setLoading(false);
    }
  }, [applyUser, authUser, accessToken]);

  useEffect(() => {
    if (!autoLoad) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [autoLoad, accessToken, loadProfile]);

  const handleChange = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetFormFromProfile = () => {
    applyUser(profile);
    setFieldErrors({});
    toast.message("تم استرجاع آخر بيانات محفوظة");
  };

  const saveProfile = async (extraBody = {}) => {
    const errors = validateBaseProfile(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("راجع الحقول المطلوبة");
      return false;
    }

    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || "",
        avatar_url: form.avatar_url.trim(),
        ...extraBody
      });
      const saved = res?.data || profile;
      applyUser(saved);
      setIsAuthFallback(false);
      notifyProfileUpdated();
      toast.success(res?.message || "تم حفظ التغييرات");
      return true;
    } catch (err) {
      toast.error(err.message || "تعذر حفظ الملف الشخصي");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    form,
    fieldErrors,
    loading,
    saving,
    error,
    isAuthFallback,
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile,
    setFieldErrors
  };
}
