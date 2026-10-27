// src/components/MainDashboard/sectionFromPath.ts

/**
 * Map the current HTML filename to a section key. Used by the mobile
 * dashboard shell to highlight the correct bottom-nav tab.
 *
 * Returns `''` when the current page is the landing page (greeting
 * screen) - no tab is active.
 */
export const sectionFromPath = (
  fileNameToKey: Record<string, string>,
): string => {
  try {
    const path = window.location.pathname;
    const fileName = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
    return fileNameToKey[fileName] ?? '';
  } catch {
    return '';
  }
};