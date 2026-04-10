import { useEffect } from "react";
import { ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ImageGeneratorDialog({
  open,
  onOpenChange,
  defaultAppId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAppId?: number;
}) {
  // Sync defaultAppId only when dialog opens (not while already open)
  useEffect(() => {
    void defaultAppId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Generate Image
          </DialogTitle>
          <DialogDescription>
            Describe the image you want to generate and choose a visual style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 px-4 py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              Image generation unavailable
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This cloud-backed feature has been removed from the normal app
              flow for now. Local image upload and theme generation remain
              available.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled>Generate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
