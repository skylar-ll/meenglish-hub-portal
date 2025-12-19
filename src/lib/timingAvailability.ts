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
 * - If both levels and courses are selected, a class must match at least one level AND at least one course
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
  const selectedLevels = (selections.selectedLevels ?? []).filter(s => s && s.trim().length > 0);
  const selectedCourses = (selections.selectedCourses ?? []).filter(s => s && s.trim().length > 0);
  
  const hasLevelSelection = selectedLevels.length > 0;
  const hasCourseSelection = selectedCourses.length > 0;
  
  // If nothing is selected, return all timings
  if (!hasLevelSelection && !hasCourseSelection) {
    return [...new Set(classes.map(c => c.timing).filter(Boolean))];
  }

  const matchedClasses = classes.filter((cls) => {
    const classLevels = cls.levels ?? [];
    const classCourses = cls.courses ?? [];
    
    // Check level match
    let levelMatches = true;
    if (hasLevelSelection) {
      levelMatches = selectedLevels.some(selectedLevel =>
        classLevels.some(classLevel => matchLevel(classLevel, selectedLevel))
      );
    }
    
    // Check course match
    let courseMatches = true;
    if (hasCourseSelection) {
      courseMatches = selectedCourses.some(selectedCourse =>
        classCourses.some(classCourse => matchCourse(classCourse, selectedCourse))
      );
    }
    
    // If both are selected, both must match
    // If only one is selected, only that one needs to match
    if (hasLevelSelection && hasCourseSelection) {
      return levelMatches && courseMatches;
    } else if (hasLevelSelection) {
      return levelMatches;
    } else {
      return courseMatches;
    }
  });

  // Extract unique timings from matched classes
  const timings = [...new Set(matchedClasses.map(c => c.timing).filter(Boolean))];
  
  console.log("🔍 computeAllowedTimingsForSelections:", {
    selectedLevels,
    selectedCourses,
    totalClasses: classes.length,
    matchedClasses: matchedClasses.length,
    allowedTimings: timings
  });
  
  return timings;
}
