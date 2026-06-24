import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ open, count, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" strokeWidth={2} />
            Delete {count === 1 ? "idea" : `${count} ideas`}?
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "This idea will be permanently removed and cannot be recovered."
              : `These ${count} ideas will be permanently removed and cannot be recovered.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {count === 1 ? "idea" : `${count} ideas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
