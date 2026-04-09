import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Sparkles } from "lucide-react";
import {
  useGenerateThemePrompt,
  useThemeGenerationModelOptions,
} from "@/hooks/useCustomThemes";
import { ipc } from "@/ipc/types";
import { showError } from "@/lib/toast";
import { toast } from "sonner";
import type { ThemeGenerationMode, ThemeGenerationModel } from "@/ipc/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 5;

interface ThemeImage {
  path: string;
  preview: string;
}

interface AIGeneratorTabProps {
  aiName: string;
  setAiName: (name: string) => void;
  aiDescription: string;
  setAiDescription: (desc: string) => void;
  aiGeneratedPrompt: string;
  setAiGeneratedPrompt: (prompt: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isDialogOpen: boolean;
}

export function AIGeneratorTab({
  aiName,
  setAiName,
  aiDescription,
  setAiDescription,
  aiGeneratedPrompt,
  setAiGeneratedPrompt,
  onSave,
  isSaving,
  isDialogOpen,
}: AIGeneratorTabProps) {
  const [aiImages, setAiImages] = useState<ThemeImage[]>([]);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiGenerationMode, setAiGenerationMode] =
    useState<ThemeGenerationMode>("inspired");
  const [aiSelectedModel, setAiSelectedModel] =
    useState<ThemeGenerationModel>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDialogOpenRef = useRef(isDialogOpen);

  const generatePromptMutation = useGenerateThemePrompt();
  const isGenerating = generatePromptMutation.isPending;
  const { themeGenerationModelOptions, isLoadingThemeGenerationModelOptions } =
    useThemeGenerationModelOptions();

  const cleanupImages = useCallback(
    async (images: ThemeImage[], showErrors = false) => {
      images.forEach((img) => {
        URL.revokeObjectURL(img.preview);
      });

      const paths = images.map((img) => img.path);
      if (paths.length === 0) {
        return;
      }

      try {
        await ipc.template.cleanupThemeImages({ paths });
      } catch {
        if (showErrors) {
          showError("Failed to cleanup temporary image files");
        }
      }
    },
    [],
  );

  useEffect(() => {
    isDialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen]);

  useEffect(() => {
    const firstModelId = themeGenerationModelOptions[0]?.id ?? "";
    if (!firstModelId) {
      return;
    }

    if (
      !aiSelectedModel ||
      !themeGenerationModelOptions.some((model) => model.id === aiSelectedModel)
    ) {
      setAiSelectedModel(firstModelId);
    }
  }, [aiSelectedModel, themeGenerationModelOptions]);

  const aiImagesRef = useRef<ThemeImage[]>([]);
  useEffect(() => {
    aiImagesRef.current = aiImages;
  }, [aiImages]);

  useEffect(() => {
    if (!isDialogOpen) {
      const imagesToCleanup = aiImagesRef.current;
      if (imagesToCleanup.length > 0) {
        cleanupImages(imagesToCleanup);
        setAiImages([]);
      }
      setAiKeywords("");
      setAiGenerationMode("inspired");
      setAiSelectedModel(themeGenerationModelOptions[0]?.id ?? "");
    }
  }, [isDialogOpen, cleanupImages, themeGenerationModelOptions]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const availableSlots = MAX_IMAGES - aiImages.length;
      if (availableSlots <= 0) {
        showError(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      const filesToProcess = Array.from(files).slice(0, availableSlots);
      const skippedCount = files.length - filesToProcess.length;

      if (skippedCount > 0) {
        showError(
          `Only ${availableSlots} image${availableSlots === 1 ? "" : "s"} can be added. ${skippedCount} file${skippedCount === 1 ? " was" : "s were"} skipped.`,
        );
      }

      setIsUploading(true);

      try {
        const newImages: ThemeImage[] = [];

        for (const file of filesToProcess) {
          if (!file.type.startsWith("image/")) {
            showError(
              `Please upload only image files. "${file.name}" is not a valid image.`,
            );
            continue;
          }

          if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            showError(`File "${file.name}" exceeds 10MB limit (${sizeMB}MB)`);
            continue;
          }

          try {
            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("Failed to read file"));
              reader.onload = () => {
                const base64 = reader.result as string;
                const data = base64.split(",")[1];
                if (!data) {
                  reject(new Error("Failed to extract image data"));
                  return;
                }
                resolve(data);
              };
              reader.readAsDataURL(file);
            });

            const result = await ipc.template.saveThemeImage({
              data: base64Data,
              filename: file.name,
            });

            newImages.push({
              path: result.path,
              preview: URL.createObjectURL(file),
            });
          } catch (err) {
            showError(
              `Error processing "${file.name}": ${err instanceof Error ? err.message : "Unknown error"}`,
            );
          }
        }

        if (newImages.length === 0) {
          return;
        }

        if (!isDialogOpenRef.current) {
          await cleanupImages(newImages);
          return;
        }

        setAiImages((prev) => {
          const remaining = MAX_IMAGES - prev.length;
          return [...prev, ...newImages.slice(0, remaining)];
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [aiImages.length, cleanupImages],
  );

  const handleRemoveImage = useCallback(
    async (index: number) => {
      const imageToRemove = aiImages[index];
      if (imageToRemove) {
        await cleanupImages([imageToRemove], true);
      }
      setAiImages((prev) => prev.filter((_, i) => i !== index));
    },
    [aiImages, cleanupImages],
  );

  const handleGenerate = useCallback(async () => {
    if (aiImages.length === 0) {
      showError("Please upload at least one image");
      return;
    }

    try {
      const result = await generatePromptMutation.mutateAsync({
        imagePaths: aiImages.map((img) => img.path),
        keywords: aiKeywords,
        generationMode: aiGenerationMode,
        model: aiSelectedModel,
      });
      setAiGeneratedPrompt(result.prompt);
      toast.success("Theme prompt generated successfully");
    } catch (error) {
      showError(
        `Failed to generate theme: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [
    aiImages,
    aiKeywords,
    aiGenerationMode,
    aiSelectedModel,
    generatePromptMutation,
    setAiGeneratedPrompt,
  ]);

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="ai-name">Theme Name</Label>
        <Input
          id="ai-name"
          placeholder="My AI-Generated Theme"
          value={aiName}
          onChange={(e) => setAiName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-description">Description (optional)</Label>
        <Input
          id="ai-description"
          placeholder="A brief description of your theme"
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Reference Images</Label>
        <div
          className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
          {isUploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {isUploading ? "Uploading..." : "Click to upload images"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Upload UI screenshots to inspire your theme
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          {aiImages.length} / {MAX_IMAGES} images
          {aiImages.length >= MAX_IMAGES && (
            <span className="text-destructive ml-2">Maximum reached</span>
          )}
        </p>

        {aiImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {aiImages.map((img, index) => (
              <div key={img.path} className="relative group">
                <img
                  src={img.preview}
                  alt={`Upload ${index + 1}`}
                  className="h-16 w-16 object-cover rounded-md border"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-keywords">Keywords (optional)</Label>
        <Input
          id="ai-keywords"
          placeholder="modern, minimal, dark mode, glassmorphism..."
          value={aiKeywords}
          onChange={(e) => setAiKeywords(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Add keywords or reference designs to guide the generation
        </p>
      </div>

      <div className="space-y-3">
        <Label>Generation Mode</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAiGenerationMode("inspired")}
            className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
              aiGenerationMode === "inspired"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
          >
            <span className="font-medium">Inspired</span>
            <span className="text-xs text-muted-foreground mt-1">
              Extracts an abstract, reusable design system. Does not replicate
              the original UI.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAiGenerationMode("high-fidelity")}
            className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
              aiGenerationMode === "high-fidelity"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
          >
            <span className="font-medium">High Fidelity</span>
            <span className="text-xs text-muted-foreground mt-1">
              Recreates the visual system from the image as closely as possible.
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Model Selection</Label>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3"
          role="radiogroup"
          aria-label="Model Selection"
        >
          {isLoadingThemeGenerationModelOptions ? (
            <div className="col-span-full flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading models...
            </div>
          ) : themeGenerationModelOptions.length === 0 ? (
            <div className="col-span-full text-center py-3 text-sm text-muted-foreground">
              No models available
            </div>
          ) : (
            themeGenerationModelOptions.map((modelOption) => (
              <button
                key={modelOption.id}
                type="button"
                role="radio"
                aria-checked={aiSelectedModel === modelOption.id}
                onClick={() => setAiSelectedModel(modelOption.id)}
                className={`flex flex-col items-center rounded-lg border p-3 text-center transition-colors ${
                  aiSelectedModel === modelOption.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="font-medium text-sm">{modelOption.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={
          isLoadingThemeGenerationModelOptions ||
          !aiSelectedModel ||
          isGenerating ||
          aiImages.length === 0
        }
        variant="secondary"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating prompt...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Theme Prompt
          </>
        )}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Generated Prompt</Label>
        {aiGeneratedPrompt ? (
          <Textarea
            id="ai-prompt"
            className="min-h-[200px] font-mono text-sm"
            value={aiGeneratedPrompt}
            onChange={(e) => setAiGeneratedPrompt(e.target.value)}
            placeholder="Generated prompt will appear here..."
          />
        ) : (
          <div className="min-h-[100px] border rounded-md p-4 flex items-center justify-center text-muted-foreground text-sm text-center">
            No prompt generated yet. Upload images and click "Generate" to
            create a theme prompt.
          </div>
        )}
      </div>

      {aiGeneratedPrompt && (
        <Button
          onClick={onSave}
          disabled={isSaving || !aiName.trim()}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Theme"
          )}
        </Button>
      )}
    </div>
  );
}
