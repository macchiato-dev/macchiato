import { ContentValidationError } from "@macchiato-dev/hub/content";
import { validateAllowedUrlPatterns } from "@macchiato-dev/hub/url-pattern";

export function validateProjectUrlPatterns(snapshot) {
  const patterns = snapshot?.config?.containerOptions?.allowedLinkPatterns ||
    snapshot?.config?.container?.allowedLinkPatterns;
  if (patterns === undefined) return;
  if (!Array.isArray(patterns) || patterns.some((pattern) => typeof pattern !== "string")) {
    throw new ContentValidationError("snapshot", "allowed link URL patterns must be strings");
  }
  try {
    validateAllowedUrlPatterns(patterns);
  } catch (error) {
    throw new ContentValidationError("snapshot", error.message);
  }
}
