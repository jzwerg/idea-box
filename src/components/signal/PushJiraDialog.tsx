import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { RequestRecord } from "@/lib/mock-requests";
import { Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: RequestRecord[];
  onConfirm: (project: string, issueType: string) => void;
}

export function PushJiraDialog({ open, onOpenChange, requests, onConfirm }: Props) {
  const [project, setProject] = useState("UREG");
  const [issueType, setIssueType] = useState("Story");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Push to Jira</DialogTitle>
          <DialogDescription>
            {requests.length} {requests.length === 1 ? "request" : "requests"} will be created as
            tickets. Signal writes once at push — no two-way sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Project
              </Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UREG">UREG — Platform</SelectItem>
                  <SelectItem value="KYC">KYC</SelectItem>
                  <SelectItem value="RISK">RISK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Issue type
              </Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Story">Story</SelectItem>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Field mapping
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-y-1 font-mono">
              <span className="text-muted-foreground">summary</span>
              <span>← title</span>
              <span className="text-muted-foreground">description</span>
              <span>← description + sources + rationale</span>
              <span className="text-muted-foreground">component</span>
              <span>← product_area</span>
              <span className="text-muted-foreground">priority</span>
              <span>← priority_score</span>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
            {requests.map((r) => (
              <div key={r.id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                <span className="truncate">{r.title}</span>
                <span className="font-mono text-xs text-muted-foreground shrink-0">
                  {r.productArea}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={() => onConfirm(project, issueType)}>
            <Send className="h-4 w-4" />
            Create {requests.length} {requests.length === 1 ? "ticket" : "tickets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
