import * as Sentry from "@sentry/cloudflare";
import { createApiHandler, type ApiEnv } from "./app";

let handler: ReturnType<typeof createApiHandler> | undefined;

const worker = {
  fetch(request: Request, env: ApiEnv): Promise<Response> {
    handler ??= createApiHandler(env);
    return handler(request);
  }
};

export default Sentry.withSentry<ApiEnv>(env => {
  if (!env.SENTRY_DSN) return undefined;
  const configuredSampleRate = Number(env.SENTRY_TRACES_SAMPLE_RATE);
  return {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? "production",
    release: env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: Number.isFinite(configuredSampleRate) ? Math.min(1, Math.max(0, configuredSampleRate)) : 0.1,
    beforeSend(event) {
      event.user = undefined;
      if (event.request) {
        event.request = { method: event.request.method, url: event.request.url };
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") breadcrumb.data = undefined;
      return breadcrumb;
    }
  };
}, worker);
