export const VALID_GRADES = [
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

export const VALID_SCHOOL_LEVELS = ["preparatory", "secondary"];

export const GRADE_LABELS = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي",
  prep_first: "الأول الإعدادي",
  prep_second: "الثاني الإعدادي",
  prep_third: "الثالث الإعدادي",
  sec_first: "الأول الثانوي",
  sec_second: "الثاني الثانوي",
  sec_third: "الثالث الثانوي"
};

export function isValidGrade(grade) {
  return VALID_GRADES.includes(grade);
}

export function isValidSchoolLevel(level) {
  return VALID_SCHOOL_LEVELS.includes(level);
}

export function defaultGradeForLevel(schoolLevel) {
  return schoolLevel === "preparatory" ? "prep_third" : "sec_third";
}

export function deriveSchoolLevelFromGrade(grade) {
  if (!grade) return "secondary";
  if (String(grade).startsWith("prep_")) return "preparatory";
  return "secondary";
}

/** Legacy + modern grade aliases for session matching. */
export function gradeMatchValues(grade) {
  if (!grade) return [];
  const g = String(grade);
  const forward = { first: "sec_first", second: "sec_second", third: "sec_third" };
  const backward = { sec_first: "first", sec_second: "second", sec_third: "third" };
  const values = new Set([g]);
  if (forward[g]) values.add(forward[g]);
  if (backward[g]) values.add(backward[g]);
  return [...values];
}

export function applyGradeFilter(query, grade) {
  const grades = gradeMatchValues(grade);
  if (grades.length === 0) return query;
  if (grades.length === 1) return query.eq("grade", grades[0]);
  return query.in("grade", grades);
}
