"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { dashboardApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { studentBtnPrimary, studentBtnSecondary } from "@/lib/student-styles";

const DOC_LABELS = {
  student_id: "بطاقة طالب",
  national_id: "رقم قومي",
  syndicate_card: "كرت نقابة"
};

const ROLE_LABELS = {
  student: "طالب",
  teacher: "مدرس"
};

export default function AdminVerificationPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.adminVerificationDocuments("status=pending&limit=50");
      setRows(res?.data?.data || []);
    } catch (err) {
      toast.error(err.message || "تعذر تحميل الطلبات");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDoc = async (id) => {
    try {
      const res = await dashboardApi.adminVerificationSignedUrl(id);
      const url = res?.data?.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err.message || "تعذر فتح المستند");
    }
  };

  const approve = async (id) => {
    setMutatingId(id);
    try {
      await dashboardApi.adminVerificationApprove(id);
      toast.success("تم الاعتماد");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.message || "تعذر الاعتماد");
    } finally {
      setMutatingId("");
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    setMutatingId(rejectId);
    try {
      await dashboardApi.adminVerificationReject(rejectId, rejectReason);
      toast.success("تم الرفض");
      setRows((prev) => prev.filter((r) => r.id !== rejectId));
      setRejectId(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err.message || "تعذر الرفض");
    } finally {
      setMutatingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري تحميل طلبات التحقق..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="التحقق من الهوية"
        title="مراجعة المستندات"
        subtitle="اعتماد أو رفض مستندات الطلاب والمدرسين"
        actions={[
          { label: "تحديث", icon: "refresh", variant: "secondary", onClick: load }
        ]}
      />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-auth-outline-variant/20 p-6 text-center text-sm text-auth-on-surface-variant">
          لا توجد طلبات قيد المراجعة
        </p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => {
              const user = row.users || {};
              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-auth-outline-variant/20 bg-auth-surface-high p-4 shadow-sm"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-auth-on-surface-variant">المستخدم</p>
                      <p className="font-bold">{user.full_name || "—"}</p>
                      {user.email ? (
                        <p className="text-xs text-auth-on-surface-variant" dir="ltr">
                          {user.email}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-auth-on-surface-variant">الدور</p>
                        <p>{ROLE_LABELS[user.role] || user.role}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-auth-on-surface-variant">المستند</p>
                        <p>{DOC_LABELS[row.doc_type] || row.doc_type}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-auth-on-surface-variant">التاريخ</p>
                      <p className="text-sm">{new Date(row.created_at).toLocaleString("ar-EG")}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-auth-outline-variant/10 pt-4">
                    <button
                      type="button"
                      onClick={() => openDoc(row.id)}
                      className={cn(studentBtnSecondary, "text-xs py-1.5 px-3")}
                    >
                      عرض
                    </button>
                    <button
                      type="button"
                      disabled={mutatingId === row.id}
                      onClick={() => approve(row.id)}
                      className={cn(studentBtnPrimary, "text-xs py-1.5 px-3")}
                    >
                      اعتماد
                    </button>
                    <button
                      type="button"
                      disabled={mutatingId === row.id}
                      onClick={() => {
                        setRejectId(row.id);
                        setRejectReason("");
                      }}
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                    >
                      رفض
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-auth-outline-variant/20 md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-auth-surface-variant/20 text-auth-on-surface-variant">
              <tr>
                <th className="px-4 py-3 text-start font-bold">المستخدم</th>
                <th className="px-4 py-3 text-start font-bold">الدور</th>
                <th className="px-4 py-3 text-start font-bold">المستند</th>
                <th className="px-4 py-3 text-start font-bold">التاريخ</th>
                <th className="px-4 py-3 text-start font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const user = row.users || {};
                return (
                  <tr key={row.id} className="border-t border-auth-outline-variant/10">
                    <td className="px-4 py-3">
                      <div className="font-bold">{user.full_name || "—"}</div>
                      <div className="text-xs text-auth-on-surface-variant" dir="ltr">
                        {user.email || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role] || user.role}</td>
                    <td className="px-4 py-3">{DOC_LABELS[row.doc_type] || row.doc_type}</td>
                    <td className="px-4 py-3">
                      {new Date(row.created_at).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openDoc(row.id)}
                          className={cn(studentBtnSecondary, "text-xs py-1.5 px-3")}
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          disabled={mutatingId === row.id}
                          onClick={() => approve(row.id)}
                          className={cn(studentBtnPrimary, "text-xs py-1.5 px-3")}
                        >
                          اعتماد
                        </button>
                        <button
                          type="button"
                          disabled={mutatingId === row.id}
                          onClick={() => {
                            setRejectId(row.id);
                            setRejectReason("");
                          }}
                          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                        >
                          رفض
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4">
          <div className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto rounded-2xl bg-auth-surface p-5 shadow-xl sm:p-6">
            <h3 className="text-lg font-black">سبب الرفض</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-auth-outline-variant/30 bg-auth-surface-variant/20 p-3 text-sm"
              placeholder="اكتب سبب الرفض للمستخدم…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className={studentBtnSecondary}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={!rejectReason.trim() || mutatingId === rejectId}
                className="rounded-xl bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
