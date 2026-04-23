import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";

export default function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
  busy = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-900">
            <AlertTriangle
              size={18}
              className={destructive ? "text-red-600" : "text-amber-600"}
            />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-800 text-white hover:bg-zinc-900"
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
