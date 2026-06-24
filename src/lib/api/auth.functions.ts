import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getSession } from "../auth.server";

export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  return getSession(request);
});
