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

const matchesLoose = (a: string, b: string) => {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  return na === nb || na.includes(nb) || nb.includes(na);
};

/**
 * Computes allowed timings from classes.
 * Rule:
 * - If both levels and courses are selected, timings come from classes that match BOTH.
 * - If only one is selected, timings come from classes that match that selection.
 * - If numeric levels are selected, non-numeric "level" strings won't expand results.
 */
export function computeAllowedTimingsForSelections(
  classes: ClassTimingSource[],
  selections: {
    selectedLevels: string[];
    selectedCourses: string[];
  }
): string[] {
  const selectedLevels = selections.selectedLevels ?? [];
  const selectedCourses = selections.selectedCourses ?? [];

  const levelKeys = selectedLevels
    .map(extractLevelKey)
    .filter((k): k is string => Boolean(k));
  const hasLevelKeys = levelKeys.length > 0;

  const levelMatch = (cls: ClassTimingSource): boolean => {
    if (selectedLevels.length === 0) return true;

    const classLevels = cls.levels ?? [];
    const classCourses = cls.courses ?? [];

    // If we have numeric levels selected, only those should drive the level matching.
    if (hasLevelKeys) {
      return classLevels.some((lvl) => {
        const k = extractLevelKey(lvl);
        return k ? levelKeys.includes(k) : false;
      });
    }

    // Otherwise, match loosely against either stored level labels or (sometimes) course labels.
    return selectedLevels.some((sel) =>
      classLevels.some((lvl) => matchesLoose(lvl, sel)) ||
      classCourses.some((c) => matchesLoose(c, sel))
    );
  };

  const courseMatch = (cls: ClassTimingSource): boolean => {
    if (selectedCourses.length === 0) return true;
    const classCourses = cls.courses ?? [];
    return selectedCourses.some((sel) => classCourses.some((c) => matchesLoose(c, sel)));
  };

  const matched = classes.filter((cls) => levelMatch(cls) && courseMatch(cls));
  return [...new Set(matched.map((c) => c.timing).filter(Boolean))];
}
