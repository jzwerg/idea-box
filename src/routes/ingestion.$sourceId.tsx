import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ingestion/$sourceId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/settings/sources/$sourceId",
      params: { sourceId: params.sourceId },
    });
  },
});
