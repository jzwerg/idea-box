import { Auth } from "@auth/core";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAuthConfig } from "../../../lib/auth.server";

// Auth.js catch-all handler.
// TanStack Start routes this via the file-based router.
// All /api/auth/* requests are forwarded to Auth.js core.
export const authHandler = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return Auth(request, getAuthConfig());
});

export const authHandlerPost = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  return Auth(request, getAuthConfig());
});
