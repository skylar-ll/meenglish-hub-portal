// Centralized formatting helpers for PDF generation.
// jsPDF's default fonts can break when given Arabic-Indic digits coming from the user's browser locale.
// We force Latin digits for all numeric output to keep PDFs stable across devices/locales.

export const formatPdfNumber = (
  value: number,
  opts: Intl.NumberFormatOptions = {}
): string => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...opts,
  }).format(value);
};
