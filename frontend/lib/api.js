"use client";

import { createClient } from "./supabase/client";
import { useAuthStore } from "@/store/authStore";
import { cachedApiRequest, clearApiCache, fetchAuthMe } from "@/lib/api-cache";
import { getApiBaseUrl } from "@/lib/api-base";

/** Append query string; accepts "limit=50" or "?limit=50" without duplicating "?". */
function withQuery(path, query = "") {
  const q = String(query || "").trim();
  if (!q) return path;
  return q.startsWith("?") ? `${path}${q}` : `${path}?${q}`;
}

async function getAuthToken() {
  if (typeof window === "undefined") return null;

  const cached = useAuthStore.getState().session?.access_token;
  if (cached) return cached;

  try {
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      useAuthStore.getState().setAuth({
        user: session.user ?? null,
        session
      });
      return session.access_token;
    }

    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) {
      useAuthStore.getState().setAuth({
        user: refreshed.session.user ?? null,
        session: refreshed.session
      });
      return refreshed.session.access_token;
    }
  } catch {
    return null;
  }

  return null;
}

async function performApiFetch(path, options = {}, tokenOverride = null) {
  let token = tokenOverride ?? (await getAuthToken());

  if (!token && path.startsWith("/auth/me")) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    token = tokenOverride ?? (await getAuthToken());
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers, cache: "no-store" });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || payload?.success === false) {
    const apiVersion = res.headers.get("x-peak-api-version");
    let message = payload?.error || payload?.message || `Request failed (${res.status})`;
    const dailyInfo = payload?.data?.daily_info;
    if (dailyInfo && typeof dailyInfo === "string") {
      message = `${message} (${dailyInfo})`;
    }
    if (res.status === 429) {
      message =
        "طلبات كثيرة على الخادم. انتظر قليلًا ثم حدّث الصفحة، أو أعد تشغيل واجهة التطوير بعد إعادة تشغيل backend.";
    }
    if (res.status === 503) {
      message =
        apiVersion && String(apiVersion).includes("2026-06-09-schema-v2")
          ? message
          : `الخادم على المنفذ 4000 قديم. أوقف كل نوافذ backend ثم من مجلد backend شغّل: npm run dev — ثم تحقق من ${API_URL.replace(/\/api$/, "")}/api/health (يجب أن يظهر api_version: 2026-06-09-schema-v2).`;
    }
    const requestError = new Error(message);
    requestError.status = res.status;
    requestError.code = payload?.code || payload?.data?.code;
    requestError.details = payload?.details;
    requestError.data = payload?.data;
    requestError.apiVersion = apiVersion;
    throw requestError;
  }

  return payload;
}

export async function apiRequest(path, options = {}, tokenOverride = null) {
  const token = tokenOverride ?? (await getAuthToken());
  return cachedApiRequest(path, options, token, () =>
    performApiFetch(path, options, token ?? tokenOverride)
  );
}

export { clearApiCache };

function fetchMe(tokenOverride) {
  return fetchAuthMe(() => performApiFetch("/auth/me", {}, tokenOverride), tokenOverride);
}

export const authApi = {
  me: (token) => fetchMe(token),
  setupProfile: async (body) => {
    const result = await apiRequest("/auth/setup-profile", {
      method: "POST",
      body: JSON.stringify(body)
    });
    clearApiCache();
    return result;
  },
  updateProfile: async (body) => {
    const result = await apiRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(body)
    });
    clearApiCache("/auth/me");
    return result;
  },
  uploadAvatar: async ({ image_base64, content_type }) => {
    const result = await apiRequest("/auth/avatar", {
      method: "POST",
      body: JSON.stringify({ image_base64, content_type })
    });
    clearApiCache("/auth/me");
    return result;
  }
};

export const sessionsApi = {
  list: (query = "") => apiRequest(withQuery("/sessions", query)),
  closeOpen: async () => {
    clearApiCache("/sessions");
    return apiRequest("/sessions/close-open", { method: "POST" });
  },
  purgeDailyRooms: async () => {
    clearApiCache("/sessions");
    return apiRequest("/sessions/purge-daily-rooms", { method: "POST" });
  },
  cancel: async (sessionId) => {
    clearApiCache("/sessions");
    return apiRequest(`/sessions/${sessionId}/cancel`, { method: "PATCH" });
  },
  start: (sessionId) => apiRequest(`/sessions/${sessionId}/start`, { method: "POST" }),
  muteAll: (sessionId) => apiRequest(`/sessions/${sessionId}/mute-all`, { method: "POST" }),
  end: async (sessionId) => {
    clearApiCache("/sessions");
    return apiRequest(`/sessions/${sessionId}/end`, { method: "POST" });
  },
  get: (sessionId) => apiRequest(`/sessions/${sessionId}`),
  create: (body) =>
    apiRequest("/sessions", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  enroll: (sessionId, body = {}) =>
    apiRequest(`/sessions/${sessionId}/enroll`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  cancelEnrollment: (sessionId) =>
    apiRequest(`/sessions/${sessionId}/cancel-enrollment`, { method: "POST" }),
  getRoom: (sessionId) => apiRequest(`/sessions/${sessionId}/room`),
  join: (sessionId) =>
    apiRequest(`/sessions/${sessionId}/join`, { method: "POST" }),
  getEnrollments: (sessionId) => apiRequest(`/sessions/${sessionId}/enrollments`),
  waitingStudents: (sessionId) => apiRequest(`/sessions/${sessionId}/waiting-students`),
  waitingHeartbeat: (sessionId) =>
    apiRequest(`/sessions/${sessionId}/waiting-heartbeat`, { method: "POST" })
};

export const paymentsApi = {
  validatePromo: ({ code, session_id, payment_type = "pay_per_session", plan_id }) =>
    apiRequest("/payments/validate-promo", {
      method: "POST",
      body: JSON.stringify({ code, session_id, payment_type, plan_id })
    }),
  initiate: (amount, sessionId, promoCode) =>
    apiRequest("/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(amount),
        session_id: sessionId,
        type: "session_payment",
        promo_code: promoCode || undefined
      })
    }),
  initiateQuestion: (amount, { subject, content, grade }) =>
    apiRequest("/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(amount),
        type: "question_payment",
        subject,
        content,
        grade
      })
    }),
  transactionStatus: (transactionId) => apiRequest(`/payments/transactions/${transactionId}/status`),
  history: (query = "") => apiRequest(withQuery("/payments/history", query))
};

/** Log API failures with context (teacher dashboard debugging). */
export function logApiError(context, err) {
  console.error(`[API] ${context}:`, {
    message: err?.message,
    status: err?.status,
    code: err?.code,
    details: err?.details,
    data: err?.data
  });
}

export const teacherApi = {
  dashboard: () => apiRequest("/teacher/dashboard"),
  analytics: () => apiRequest("/teacher/analytics"),
  reviews: (limit = 5) => apiRequest(`/teacher/reviews?limit=${limit}`),
  sessionCounts: () => apiRequest("/teacher/session-counts")
};

export const studentApi = {
  dashboard: () => apiRequest("/student/dashboard"),
  profile: () => apiRequest("/student/profile"),
  updateProfile: (body) =>
    apiRequest("/student/profile", {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  sessions: (query = "") => apiRequest(withQuery("/student/sessions", query)),
  session: (id) => apiRequest(`/student/sessions/${id}`),
  enrollmentOptions: (sessionId) =>
    apiRequest(`/student/enrollment-options?session_id=${encodeURIComponent(sessionId)}`),
  questions: (query = "") => apiRequest(withQuery("/questions", query)),
  questionsOverview: () => apiRequest("/questions/overview"),
  askQuestion: (body) =>
    apiRequest("/questions", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  studyRooms: () => apiRequest("/study-rooms"),
  joinStudyRoom: (roomId) =>
    apiRequest(`/study-rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  joinRandomStudyRoom: (body) =>
    apiRequest("/study-rooms/join-random", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  leaveStudyRoom: (roomId) =>
    apiRequest(`/study-rooms/${roomId}/leave`, {
      method: "POST",
      body: JSON.stringify({})
    })
};

export const subscriptionsApi = {
  plans: () => apiRequest("/subscriptions/plans"),
  me: () => apiRequest("/subscriptions/me"),
  purchase: (planId, promoCode) =>
    apiRequest("/subscriptions/purchase", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId, promo_code: promoCode || undefined })
    })
};

export const enrollmentsApi = {
  trialStatus: ({ teacher_id, subject_id, session_id }) => {
    const q = new URLSearchParams({ teacher_id, subject_id });
    if (session_id) q.set("session_id", session_id);
    return apiRequest(`/enrollments/trial-status?${q}`);
  }
};

export const promotionsApi = {
  validate: ({ code, payment_type = "per_session", session_id, plan_id }) =>
    apiRequest("/promotions/validate", {
      method: "POST",
      body: JSON.stringify({ code, payment_type, session_id, plan_id })
    })
};

export const adminPromotionsApi = {
  list: (query = "") => apiRequest(withQuery("/admin/promotions", query)),
  create: (body) =>
    apiRequest("/admin/promotions", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiRequest(`/admin/promotions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => apiRequest(`/admin/promotions/${id}`, { method: "DELETE" }),
  uses: (id) => apiRequest(`/admin/promotions/${id}/uses`),
  stats: () => apiRequest("/admin/promotions/stats"),
  activateEarlyBird: (body) =>
    apiRequest("/admin/early-bird/activate", { method: "POST", body: JSON.stringify(body) })
};

export const questionsApi = {
  overview: () => apiRequest("/questions/overview"),
  list: (query = "") => apiRequest(withQuery("/questions", query)),
  get: (id) => apiRequest(`/questions/${id}`),
  submit: (body) =>
    apiRequest("/questions", {
      method: "POST",
      body: JSON.stringify(body)
    })
};

export const studyRoomsApi = {
  overview: () => apiRequest("/study-rooms"),
  joinRandom: (body) =>
    apiRequest("/study-rooms/join-random", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  join: (roomId) =>
    apiRequest(`/study-rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  leave: (roomId) =>
    apiRequest(`/study-rooms/${roomId}/leave`, {
      method: "POST",
      body: JSON.stringify({})
    })
};

export const adminApi = {
  getLandingStats: () => apiRequest("/admin/landing-stats"),
  updateLandingStat: (id, data) =>
    apiRequest(`/admin/landing-stats/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    })
};

export const dashboardApi = {
  adminStats: () => apiRequest("/admin/stats"),
  adminUsers: (query = "") => apiRequest(withQuery("/admin/users", query)),
  adminVerifyUser: (userId) => apiRequest(`/admin/users/${userId}/verify`, { method: "PUT" }),
  adminSuspendUser: (userId) => apiRequest(`/admin/users/${userId}/suspend`, { method: "PUT" }),
  adminActivateUser: (userId) => apiRequest(`/admin/users/${userId}/activate`, { method: "PUT" }),
  adminWithdrawals: (query = "") => apiRequest(withQuery("/admin/withdrawals", query)),
  adminUpdateWithdrawal: (id, body) =>
    apiRequest(`/admin/withdrawals/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  adminReports: (period = "month") =>
    apiRequest(`/admin/reports?period=${encodeURIComponent(period)}`),
  teacherEarningsSummary: () => apiRequest("/earnings/summary"),
  teacherEarnings: (query = "") => apiRequest(withQuery("/earnings", query)),
  teacherWithdrawals: (query = "") => apiRequest(withQuery("/earnings/withdrawals", query)),
  teacherRequestWithdrawal: (body) =>
    apiRequest("/earnings/withdraw", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  parentReport: (studentId) => apiRequest(`/parent/report/${studentId}`),
  myProfile: () => fetchMe(),
  updateMyProfile: (body) => authApi.updateProfile(body)
};

export const notificationsApi = {
  list: () => apiRequest("/notifications"),
  unreadCount: () => apiRequest("/notifications/unread-count"),
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiRequest("/notifications/read-all", { method: "PATCH" })
};

export const parentApi = {
  dashboard: (studentId) =>
    apiRequest(`/parent/dashboard${studentId ? `?student_id=${encodeURIComponent(studentId)}` : ""}`),
  children: () => apiRequest("/parent/children"),
  linkStudent: (studentCode) =>
    apiRequest("/parent/link-student", {
      method: "POST",
      body: JSON.stringify({ student_code: studentCode })
    }),
  report: (studentId) => apiRequest(`/parent/report/${studentId}`),
  downloadReport: async (studentId, token) => {
    const authToken = token ?? (await getAuthToken());
    const res = await fetch(`${getApiBaseUrl()}/parent/report/${studentId}/pdf`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      cache: "no-store"
    });
    if (!res.ok) {
      let message = "تعذر تنزيل التقرير";
      try {
        const payload = await res.json();
        message = payload?.error || payload?.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return res.blob();
  }
};
