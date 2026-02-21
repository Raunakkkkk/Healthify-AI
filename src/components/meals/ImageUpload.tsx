import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Upload, Camera, Loader2, Check } from "lucide-react";
import { useEntryStore } from "@/store/entryStore";
import api from "@/lib/api";
import type { ExtractionResult, MealType } from "@/types";
import { getConfidenceLabel, getConfidenceColor } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ImageUpload() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createEntry = useEntryStore((s) => s.createEntry);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      const { data } = await api.post<ExtractionResult>("/ai/extract-nutrition", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch {
      toast.error("Failed to analyze image. Try manual entry.");
      setOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  const confirmAndSave = async () => {
    if (!result?.foods.length) return;

    try {
      for (const food of result.foods) {
        await createEntry({
          mealType: "snack" as MealType,
          foodName: food.name,
          quantity: food.quantity || 1,
          unit: food.unit || "serving",
          calories: food.calories,
          macros: { protein: food.protein, carbs: food.carbs, fats: food.fats },
          source: "ai",
          imageId: result.imageId,
        });
      }
      toast.success(`Logged ${result.foods.length} item(s) from image!`);
      setOpen(false);
      setResult(null);
      setPreviewUrl(null);
    } catch {
      toast.error("Failed to save entries");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Camera className="h-4 w-4" />
        Scan Food
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setResult(null); setPreviewUrl(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Food Scanner</DialogTitle>
            <DialogDescription>Upload a photo of food or a nutrition label</DialogDescription>
          </DialogHeader>

          {!result ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing image with AI...</p>
                </div>
              ) : (
                <>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="mb-4 max-h-48 rounded-lg" />
                  ) : (
                    <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                  )}
                  <p className="mb-2 text-sm font-medium">Drag & drop an image here</p>
                  <p className="mb-4 text-xs text-muted-foreground">or click to browse</p>
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    Choose Image
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Confidence:</span>
                <Badge variant={result.confidence >= 0.7 ? "success" : "warning"} className={getConfidenceColor(result.confidence)}>
                  {getConfidenceLabel(result.confidence)} ({Math.round(result.confidence * 100)}%)
                </Badge>
              </div>

              {result.foods.map((food, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{food.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p>{food.quantity} {food.unit} &middot; {food.calories} kcal</p>
                    <p>P: {food.protein}g &middot; C: {food.carbs}g &middot; F: {food.fats}g</p>
                  </CardContent>
                </Card>
              ))}

              <DialogFooter>
                <Button variant="outline" onClick={() => { setResult(null); setPreviewUrl(null); }}>
                  Try Again
                </Button>
                <Button onClick={confirmAndSave} className="gap-1">
                  <Check className="h-4 w-4" /> Confirm & Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
