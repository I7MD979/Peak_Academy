import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCardSolid,
  adminInput,
  adminLabel,
  adminMuted
} from "@/lib/admin-styles";
import {
  parentBtnPrimary,
  parentBtnSecondary,
  parentCardSolid,
  parentInput,
  parentMuted
} from "@/lib/parent-styles";
import {
  studentBtnPrimary,
  studentBtnSecondary,
  studentCardSolid,
  studentInput,
  studentMuted
} from "@/lib/student-styles";
import {
  teacherBtnPrimary,
  teacherBtnSecondary,
  teacherCardSolid,
  teacherInput,
  teacherMuted
} from "@/lib/teacher-styles";

const PROFILE_STYLE_MAP = {
  admin: {
    cardSolid: adminCardSolid,
    input: adminInput,
    label: adminLabel,
    muted: adminMuted,
    btnPrimary: adminBtnPrimary,
    btnSecondary: adminBtnSecondary,
    emailInputExtra: "bg-surface-container-low opacity-80",
    mutedTextClass: "text-on-surface-variant"
  },
  parent: {
    cardSolid: parentCardSolid,
    input: parentInput,
    label: adminLabel,
    muted: parentMuted,
    btnPrimary: parentBtnPrimary,
    btnSecondary: parentBtnSecondary,
    emailInputExtra: "bg-auth-surface-low opacity-80",
    mutedTextClass: "text-auth-on-surface-variant"
  },
  student: {
    cardSolid: studentCardSolid,
    input: studentInput,
    label: adminLabel,
    muted: studentMuted,
    btnPrimary: studentBtnPrimary,
    btnSecondary: studentBtnSecondary,
    emailInputExtra: "bg-auth-surface-low opacity-80",
    mutedTextClass: "text-auth-on-surface-variant"
  },
  teacher: {
    cardSolid: teacherCardSolid,
    input: teacherInput,
    label: adminLabel,
    muted: teacherMuted,
    btnPrimary: teacherBtnPrimary,
    btnSecondary: teacherBtnSecondary,
    emailInputExtra: "bg-auth-surface-low opacity-80",
    mutedTextClass: "text-auth-on-surface-variant"
  }
};

export function getProfileStyles(variant = "admin") {
  return PROFILE_STYLE_MAP[variant] || PROFILE_STYLE_MAP.admin;
}
