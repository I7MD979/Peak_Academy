"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ParentProfileView from "@/components/parent/ParentProfilePage";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import { notifyProfileUpdated } from "@/hooks/useSidebarProfile";
import { parentApi } from "@/lib/api";
import {
  patchParentProfileUrl,
  readParentProfileParam,
  resolveParentProfileSection,
  resolveParentProfileStudentId
} from "@/lib/parent-profile";
import { createClient } from "@/lib/supabase/client";

function ParentProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = useMemo(() => resolveParentProfileSection(searchParams), [searchParams]);
  const urlStudent = useMemo(() => readParentProfileParam(searchParams, "student"), [searchParams]);

  const {
    profile,
    form,
    fieldErrors,
    loading,
    saving,
    error,
    loadProfile,
    handleChange,
    resetFormFromProfile,
    saveProfile
  } = useAccountProfile();

  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(urlStudent);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const syncUrl = useCallback(
    (patch) => {
      router.replace(patchParentProfileUrl(searchParams, patch), { scroll: false });
    },
    [router, searchParams]
  );

  const loadChildren = useCallback(async () => {
    try {
      const res = await parentApi.children();
      const list = res?.data?.children || [];
      setLinkedChildren(list);
      setSelectedChildId((current) =>
        resolveParentProfileStudentId({ linkedChildren: list, urlStudent, currentId: current })
      );
    } catch {
      setLinkedChildren([]);
    }
  }, [urlStudent]);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      try {
        await Promise.all([loadProfile(), loadChildren()]);
      } finally {
        setRefreshing(false);
      }
    },
    [loadProfile, loadChildren]
  );

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const onSectionChange = (next) => {
    syncUrl({ section: next || "all" });
  };

  const onSelectedChildChange = (childId) => {
    setSelectedChildId(childId);
    syncUrl({ student: childId, section: section === "all" ? "all" : section });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const ok = await saveProfile();
    if (ok) {
      notifyProfileUpdated();
      await loadAll({ silent: true });
    }
  };

  const handleLink = async (event) => {
    event.preventDefault();
    const code = linkCode.trim().toUpperCase();
    if (!code) {
      toast.error("أدخل كود الربط");
      return;
    }
    setLinking(true);
    try {
      const res = await parentApi.linkStudent(code);
      toast.success(res?.message || "تم ربط الطالب");
      setLinkCode("");
      await loadAll({ silent: true });
      if (res?.data?.student_id) {
        onSelectedChildChange(res.data.student_id);
      }
    } catch (err) {
      toast.error(err.message || "تعذر ربط الطالب");
    } finally {
      setLinking(false);
    }
  };

  const onPasswordSubmit = async () => {
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }

    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;
      toast.success("تم تحديث كلمة المرور بنجاح");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "تعذر تحديث كلمة المرور");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <ParentProfileView
      profile={profile}
      form={form}
      fieldErrors={fieldErrors}
      linkedChildren={linkedChildren}
      section={section}
      onSectionChange={onSectionChange}
      selectedChildId={selectedChildId}
      onSelectedChildChange={onSelectedChildChange}
      linkCode={linkCode}
      onLinkCodeChange={setLinkCode}
      onLinkSubmit={handleLink}
      linking={linking}
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error}
      onRefresh={() => loadAll({ silent: true })}
      onChange={handleChange}
      onSubmit={onSubmit}
      onReset={resetFormFromProfile}
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={(e) => setPassword(e.target.value)}
      onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
      onPasswordSubmit={onPasswordSubmit}
      passwordSaving={passwordSaving}
    />
  );
}

export default function ParentProfileRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <SectionLoader message="جاري تحميل الملف الشخصي..." />
        </div>
      }
    >
      <ParentProfileContent />
    </Suspense>
  );
}
