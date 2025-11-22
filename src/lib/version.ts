/**
 * Application Version Management
 *
 * This file contains the current version of the FTC TeamForge application.
 * When releasing a new version, update APP_VERSION and ensure corresponding
 * migration files and release notes exist.
 */

export const APP_VERSION = "1.3.0";

/**
 * Parse a semantic version string into components
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compare two semantic version strings
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }
  return 0;
}

/**
 * Check if version v1 is greater than version v2
 */
export function isVersionGreater(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) > 0;
}

/**
 * Check if version v1 is greater than or equal to version v2
 */
export function isVersionGreaterOrEqual(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) >= 0;
}

/**
 * Get all versions between two versions (inclusive of end, exclusive of start)
 * @param versions - Array of all available versions
 * @param fromVersion - Starting version (exclusive)
 * @param toVersion - Ending version (inclusive)
 */
export function getVersionsBetween(
  versions: string[],
  fromVersion: string,
  toVersion: string
): string[] {
  return versions
    .filter(v => isVersionGreater(v, fromVersion) && isVersionGreaterOrEqual(toVersion, v))
    .sort(compareVersions);
}
