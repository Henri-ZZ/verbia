import { createApiHandler, type ApiEnv } from "./app";

let handler: ReturnType<typeof createApiHandler> | undefined;

export default {
  fetch(request: Request, env: ApiEnv): Promise<Response> {
    handler ??= createApiHandler(env);
    return handler(request);
  }
};
