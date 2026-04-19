import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export type AspectRatioOption = "free" | "16:9" | "4:3" | "1:1" | "3:2";

const RATIO_VALUES: Record<AspectRatioOption, number | undefined> = {
  free: undefined,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:2": 3 / 2,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  /** Default aspect ratio – user can still change unless lockAspect=true */
  defaultAspect?: AspectRatioOption;
  lockAspect?: boolean;
  /** Mime type of output (defaults to image/jpeg). Use image/png to preserve transparency. */
  outputMime?: "image/jpeg" | "image/png" | "image/webp";
  /** JPEG/WebP quality 0-1 */
  quality?: number;
  /**
   * Minimum width (px) for the exported cropped image. The output canvas will
   * be upscaled (with high-quality smoothing) to at least this width while
   * preserving the crop aspect ratio. Defaults to 1920 to keep background/hero
   * images sharp on desktop displays.
   */
  minOutputWidth?: number;
  title?: string;
  onCropped: (file: File) => void | Promise<void>;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  defaultAspect = "free",
  lockAspect = false,
  outputMime = "image/jpeg",
  quality = 0.95,
  minOutputWidth = 1920,
  title = "Crop Image",
  onCropped,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<AspectRatioOption>(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedFile(imageSrc, croppedAreaPixels, outputMime, quality, minOutputWidth);
      await onCropped(file);
      onOpenChange(false);
      // reset for next time
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[360px] bg-muted rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={RATIO_VALUES[aspect]}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={false}
            />
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1">
              <Label className="text-xs">Zoom</Label>
              <Slider
                value={[zoom]}
                min={1}
                max={4}
                step={0.05}
                onValueChange={(v) => setZoom(v[0])}
              />
            </div>
            {!lockAspect && (
              <div className="w-full sm:w-40">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select value={aspect} onValueChange={(v) => setAspect(v as AspectRatioOption)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={processing || !imageSrc}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Read a File into a data URL */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  mime: string,
  quality: number,
  minOutputWidth: number,
): Promise<File> {
  const image = await loadImage(imageSrc);

  // Native crop dimensions (in original-image pixels)
  const cropW = Math.round(pixelCrop.width);
  const cropH = Math.round(pixelCrop.height);

  // Determine output size: keep at least minOutputWidth across, but never
  // upscale beyond ~2x to avoid soft, over-stretched results.
  const targetWidth = Math.min(Math.max(cropW, minOutputWidth), cropW * 2);
  const scale = targetWidth / cropW;
  const outW = Math.round(cropW * scale);
  const outH = Math.round(cropH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // High-quality resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    cropW,
    cropH,
    0,
    0,
    outW,
    outH,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Failed to encode image"));
        const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        resolve(new File([blob], `cropped-${Date.now()}.${ext}`, { type: mime }));
      },
      mime,
      quality,
    );
  });
}
