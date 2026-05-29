import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/staging")({
  beforeLoad: () => {
    throw redirect({ to: "/box" });
  },
});
