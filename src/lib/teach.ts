import type { RequestRecord } from "./mock-requests";

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","for","in","on","with","by","at","is","are",
  "be","this","that","it","as","from","when","we","i","our","your","their","but",
  "can","not","do","does","add","make","new","via","into","please","support","need",
]);

export function keywords(text: string, max = 3): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, max);
}

export type TeachAction =
  | "dismiss"
  | "push"
  | "pin"
  | "unpin"
  | "reorder-up"
  | "reorder-down"
  | "tag"
  | "note"
  | "group";

export interface ProposedRule {
  rule: string;
  sourceAction: TeachAction;
  sourceRequestId?: string;
  sourceTitle?: string;
}

export function buildProposedRule(
  action: TeachAction,
  request: RequestRecord | null,
  extra?: { tag?: string; note?: string; group?: string },
): ProposedRule | null {
  if (!request && action !== "reorder-up" && action !== "reorder-down") return null;
  const kws = request ? keywords(`${request.title} ${request.description}`) : [];
  const kwStr = kws.length ? kws.join(", ") : "this pattern";
  const ut = request?.userType;
  const area = request?.productArea;

  let rule = "";
  switch (action) {
    case "dismiss":
      rule = `De-prioritize requests like “${request!.title}” — keywords (${kwStr})${
        ut ? ` from ${ut}` : ""
      }. Lower impact unless reach is broad.`;
      break;
    case "push":
      rule = `Treat requests matching (${kwStr})${
        area ? ` in ${area}` : ""
      } as ready-to-ship; boost urgency.`;
      break;
    case "pin":
      rule = `Keep requests matching (${kwStr}) near the top until released${
        ut ? ` — especially from ${ut}` : ""
      }.`;
      break;
    case "unpin":
      rule = `Stop pinning requests matching (${kwStr}).`;
      break;
    case "reorder-up":
      rule = request
        ? `Boost impact for requests matching (${kwStr})${ut ? ` from ${ut}` : ""}.`
        : `Boost the recently elevated cluster.`;
      break;
    case "reorder-down":
      rule = request
        ? `Lower impact for requests matching (${kwStr})${ut ? ` from ${ut}` : ""}.`
        : `Reduce priority for the recently lowered cluster.`;
      break;
    case "tag":
      rule = `Tag requests matching (${kwStr}) as #${extra?.tag ?? "tag"}.`;
      break;
    case "note":
      rule = `Context for (${kwStr}): ${extra?.note?.slice(0, 200) ?? ""}`;
      break;
    case "group":
      rule = `Group requests matching (${kwStr}) under “${extra?.group ?? "group"}”.`;
      break;
  }

  return {
    rule,
    sourceAction: action,
    sourceRequestId: request?.id,
    sourceTitle: request?.title,
  };
}
