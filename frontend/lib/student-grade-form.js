import { parseLevelParam } from "@/lib/level-params";

export const SCHOOL_LEVEL_OPTIONS = [
  { value: "preparatory", label: "إعدادي", description: "الصف الأول إلى الثالث الإعدادي" },
  { value: "secondary", label: "ثانوي", description: "الصف الأول إلى الثالث الثانوي" }
];

export const GRADE_BY_LEVEL = {
  preparatory: [
    { value: "prep_first", label: "الأول الإعدادي" },
    { value: "prep_second", label: "الثاني الإعدادي" },
    { value: "prep_third", label: "الثالث الإعدادي" }
  ],
  secondary: [
    { value: "sec_first", label: "الأول الثانوي" },
    { value: "sec_second", label: "الثاني الثانوي" },
    { value: "sec_third", label: "الثالث الثانوي" }
  ]
};

export const STUDENT_GRADE_VALUES = [
  "prep_first",
  "prep_second",
  "prep_third",
  "sec_first",
  "sec_second",
  "sec_third",
  "first",
  "second",
  "third"
];

export function defaultSchoolLevelFromLevelParam(level) {
  return parseLevelParam(level).school_level;
}

export function defaultGradeFromLevelParam(level) {
  return parseLevelParam(level).grade;
}

export function gradesForSchoolLevel(schoolLevel) {
  return GRADE_BY_LEVEL[schoolLevel] || GRADE_BY_LEVEL.secondary;
}

export function defaultGradeForSchoolLevel(schoolLevel) {
  return schoolLevel === "preparatory" ? "prep_first" : "sec_third";
}

export function isGradeValidForSchoolLevel(grade, schoolLevel) {
  if (!grade || !schoolLevel) return false;
  return gradesForSchoolLevel(schoolLevel).some((option) => option.value === grade);
}
