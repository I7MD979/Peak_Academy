"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { authApi, dashboardApi } from "@/lib/api";
import { validateBaseProfile } from "@/lib/profile-form";

export function useAccountProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const applyUser = useCallback((user) => {
    setProfile(user);
    setForm({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      avatar_url: user?.avatar_url || ""
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dashboardApi.myProfile();
      applyUser(res?.data || null);
    } catch (err) {
      setProfile(null);
      setError(err.message || "تعذر تحميل الملف الشخصي");
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

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
        avatar_url: form.avatar_url.trim() || undefined,
        ...extraBody
      });
      applyUser(res?.data || profile);
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
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile,
    setFieldErrors
  };
}
