export type ClassTimingSource = {
  timing: string;
  levels?: string[] | null;
  courses?: string[] | null;
};

export const normalizeStr = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Returns a stable key like "level5" from values like "level-5 (1A) مستوى خامس"
export const extractLevelKey = (val: string): string | null => {
  if (!val) return null;
  const m = val.toLowerCase().match(/level[\s\-_]?(\d{1,2})/i);
  return m ? `level${m[1]}` : null;
};

export const normalizeTimingForComparison = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9:.-]/g, "");

// Check if two timing strings match (handles various formats)
export const timingsMatch = (timing1: string, timing2: string): boolean => {
  const n1 = normalizeTimingForComparison(timing1);
  const n2 = normalizeTimingForComparison(timing2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Check if one contains the other (for partial matches)
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  return false;
};

/**
 * Matches levels by comparing level keys (e.g., "level5" from "level-5 (1A) مستوى خامس")
 */
const matchLevel = (classLevel: string, selectedLevel: string): boolean => {
  const classKey = extractLevelKey(classLevel);
  const selectedKey = extractLevelKey(selectedLevel);
  
  // If both have numeric keys, compare them
  if (classKey && selectedKey) {
    return classKey === selectedKey;
  }
  
  // Fallback to normalized string comparison
  const normalizedClass = normalizeStr(classLevel);
  const normalizedSelected = normalizeStr(selectedLevel);
  
  return normalizedClass === normalizedSelected || 
         normalizedClass.includes(normalizedSelected) || 
         normalizedSelected.includes(normalizedClass);
};

/**
 * Matches courses using normalized string comparison
 */
const matchCourse = (classCourse: string, selectedCourse: string): boolean => {
  const normalizedClass = normalizeStr(classCourse);
  const normalizedSelected = normalizeStr(selectedCourse);
  
  return normalizedClass === normalizedSelected || 
         normalizedClass.includes(normalizedSelected) || 
         normalizedSelected.includes(normalizedClass);
};

/**
 * Computes allowed timings from classes based on selected levels and courses.
 *
 * Rules:
 * - If both levels and courses are selected, a class is included only if it matches at least one selected level AND at least one selected course (intersection)
 * - If only levels are selected, match any class that has a matching level
 * - If only courses are selected, match any class that has a matching course
 * - If neither is selected, return all timings
 */
export function computeAllowedTimingsForSelections(
  classes: ClassTimingSource[],
  selections: {
    selectedLevels: string[];
    selectedCourses: string[];
  }
): string[] {
  const selectedLevels = (selections.selectedLevels ?? []).filter(
    (s) => s && s.trim().length > 0
  );
  const selectedCourses = (selections.selectedCourses ?? []).filter(
    (s) => s && s.trim().length > 0
  );

  const hasLevelSelection = selectedLevels.length > 0;
  const hasCourseSelection = selectedCourses.length > 0;

  // If nothing is selected, return all timings
  if (!hasLevelSelection && !hasCourseSelection) {
    const byNorm = new Map<string, string>();
    for (const c of classes) {
      if (!c?.timing) continue;
      const key = normalizeTimingForComparison(c.timing);
      if (!byNorm.has(key)) byNorm.set(key, c.timing);
    }
    return [...byNorm.values()];
  }

  // Group classes by normalized timing to avoid duplicate formats.
  const groups = new Map<string, { display: string; classes: ClassTimingSource[] }>();
  for (const cls of classes) {
    if (!cls?.timing) continue;
    const key = normalizeTimingForComparison(cls.timing);
    const existing = groups.get(key);
    if (existing) {
      existing.classes.push(cls);
    } else {
      groups.set(key, { display: cls.timing, classes: [cls] });
    }
  }

  const timingIsAllowed = (groupClasses: ClassTimingSource[]): boolean => {
    // Levels: if multiple selected, require ALL selected levels to be covered by at least one class at this timing.
    const levelOk = !hasLevelSelection
      ? true
      : selectedLevels.length <= 1
        ? selectedLevels.some((sel) =>
            groupClasses.some((cls) => (cls.levels ?? []).some((lvl) => matchLevel(lvl, sel)))
          )
        : selectedLevels.every((sel) =>
            groupClasses.some((cls) => (cls.levels ?? []).some((lvl) => matchLevel(lvl, sel)))
          );

    // Courses: keep "ANY selected course" behavior (less strict) to avoid over-filtering.
    const courseOk = !hasCourseSelection
      ? true
      : selectedCourses.some((sel) =>
          groupClasses.some((cls) => (cls.courses ?? []).some((c) => matchCourse(c, sel)))
        );

    if (hasLevelSelection && hasCourseSelection) return levelOk && courseOk;
    if (hasLevelSelection) return levelOk;
    if (hasCourseSelection) return courseOk;
    return true;
  };

  const allowed: string[] = [];
  for (const g of groups.values()) {
    if (timingIsAllowed(g.classes)) allowed.push(g.display);
  }

  return allowed;
}
