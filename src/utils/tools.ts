/**
 * Utility class providing common helper functions for tests.
 */
export abstract class Tools {
  /**
   * Generate a random alphanumeric string.
   * @param length - The desired length of the random string.
   * @returns A random string of the specified length.
   */
  public static randomString(length: number): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  /**
   * Sanitizes a string to be a valid K8s name.
   * K8s names must be lowercase alphanumeric with hyphens and <= 63 chars.
   * @param name - The string to sanitize.
   * @returns A valid Kubernetes resource name.
   */
  public static sanitize(name: string): string {
    let sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 63);

    if (sanitized.endsWith("-")) {
      sanitized = sanitized.substring(0, sanitized.length - 1);
    }
    return sanitized;
  }
}
