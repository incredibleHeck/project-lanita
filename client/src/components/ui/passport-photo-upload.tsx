"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 2;
const MAX_DIMENSION = 400;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

interface PassportPhotoUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function PassportPhotoUpload({
  value,
  onChange,
  disabled,
  className,
}: PassportPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    resizeImage(file)
      .then((dataUrl) => onChange(dataUrl))
      .catch(() => toast.error("Failed to process image"));
    e.target.value = "";
  }

  function handleRemove() {
    onChange(null);
    if (inputRef.current?.value) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-colors",
            value
              ? "border-primary/50 bg-muted/50"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
          {value ? (
            <>
              <Avatar className="h-20 w-20">
                <AvatarImage src={value} alt="Passport photo" />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-1 -top-1 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </>
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Passport photo</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP. Max {MAX_SIZE_MB}MB.
          </p>
          {!value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Upload photo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
