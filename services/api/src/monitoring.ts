import * as Sentry from "@sentry/cloudflare";

export function reportError(error: unknown, area: string, tags: Record<string, string> = {}) {
  Sentry.withScope(scope => {
    scope.setTag("area", area);
    for (const [key, value] of Object.entries(tags)) scope.setTag(key, value);
    Sentry.captureException(error);
  });
}
