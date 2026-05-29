import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/outcome")({
  beforeLoad: () => {
    throw redirect({ to: "/box" });
  },
});
