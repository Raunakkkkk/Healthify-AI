import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Camera, Loader2, Check, X, Pencil, CheckCheck } from "lucide-react";
import { useEntryStore } from "@/store/entryStore";
import api from "@/lib/api";
import type { ExtractionResult, ExtractedFood, MealType } from "@/types";
import { getConfidenceLabel, getConfidenceColor } from "@/lib/utils";
import toast from "react-hot-toast";

const MEAL_OPTIONS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function ImageUpload() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [foodsDisplay, setFoodsDisplay] = useState<ExtractedFood[]>([]);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createEntry = useEntryStore((s) => s.createEntry);

  // Backend always returns exact format: foods[], confidence, rawText (parsing done on server only)
  useEffect(() => {
    if (!result) return;
    const foods = Array.isArray(result.foods) ? result.foods : [];
    setFoodsDisplay(foods.map((f) => ({ ...f })));
    setEditingIndex(null);
  }, [result]);

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
      setResult(null);
      setPreviewUrl(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  const reject = () => {
    setOpen(false);
    setResult(null);
    setPreviewUrl(null);
    setFoodsDisplay([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const tryAgain = () => {
    setResult(null);
    setPreviewUrl(null);
    setFoodsDisplay([]);
    setEditingIndex(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateFood = (index: number, field: keyof ExtractedFood, value: string | number) => {
    setFoodsDisplay((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const acceptAndSave = async () => {
    if (!result?.imageId || !foodsDisplay.length) return;

    try {
      for (const food of foodsDisplay) {
        await createEntry({
          mealType,
          foodName: food.name,
          quantity: food.quantity ?? 1,
          unit: food.unit || "serving",
          calories: food.calories,
          macros: { protein: food.protein, carbs: food.carbs, fats: food.fats },
          source: "ai",
          imageId: result.imageId,
        });
      }
      toast.success(`Logged ${foodsDisplay.length} item(s) from image!`);
      setOpen(false);
      setResult(null);
      setPreviewUrl(null);
      setFoodsDisplay([]);
    } catch {
      toast.error("Failed to save entries");
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Camera className="h-4 w-4" />
        <span>Scan Food</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reject();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Food Scanner</DialogTitle>
            <DialogDescription>
              Upload a photo of food or a nutrition label. Review, edit if needed, then accept or reject.
            </DialogDescription>
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
                <Badge
                  variant={result.confidence >= 0.7 ? "success" : "warning"}
                  className={getConfidenceColor(result.confidence)}
                >
                  {getConfidenceLabel(result.confidence)} ({Math.round(result.confidence * 100)}%)
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Meal type (for accepted items)</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {foodsDisplay.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Could not parse nutrition from this response. Try another image or Reject.
                  </p>
                ) : null}
                {foodsDisplay.map((food, i) => (
                  <Card key={i}>
                    {editingIndex === i ? (
                      <CardContent className="pt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={food.name}
                              onChange={(e) => updateFood(i, "name", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={0.1}
                              step={0.5}
                              value={food.quantity}
                              onChange={(e) => updateFood(i, "quantity", Number(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={food.unit}
                              onChange={(e) => updateFood(i, "unit", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="e.g. 1 cup, 2 slices, 100 g"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Calories</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.calories}
                              onChange={(e) => updateFood(i, "calories", Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Protein (g)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.protein}
                              onChange={(e) => updateFood(i, "protein", Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Carbs (g)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.carbs}
                              onChange={(e) => updateFood(i, "carbs", Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Fats (g)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={food.fats}
                              onChange={(e) => updateFood(i, "fats", Number(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full gap-1"
                          onClick={() => setEditingIndex(null)}
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Done editing
                        </Button>
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                          <CardTitle className="text-sm">{food.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingIndex(i)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground">
                          <p>
                            {food.quantity} {food.unit} &middot; {food.calories} kcal
                          </p>
                          <p>
                            P: {food.protein}g &middot; C: {food.carbs}g &middot; F: {food.fats}g
                          </p>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={tryAgain} className="gap-1 order-2 sm:order-1">
                  Try another image
                </Button>
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button variant="outline" onClick={reject} className="gap-1">
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button onClick={acceptAndSave} className="gap-1" disabled={foodsDisplay.length === 0}>
                    <Check className="h-4 w-4" /> Accept & save
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
