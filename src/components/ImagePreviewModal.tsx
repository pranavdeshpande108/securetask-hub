import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export const ImagePreviewModal = ({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) => {
  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-transparent border-none shadow-none p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Image Preview</DialogTitle>
          <DialogDescription>A larger view of the image attachment.</DialogDescription>
        </DialogHeader>
        <div className="relative flex items-center justify-center">
          <Button className="absolute top-0 right-0 m-4 rounded-full z-10" variant="default" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <img src={imageUrl} alt="Preview" className="max-h-[60vh] max-w-[60vw] object-contain rounded-lg" onContextMenu={(e) => e.preventDefault()} draggable={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
