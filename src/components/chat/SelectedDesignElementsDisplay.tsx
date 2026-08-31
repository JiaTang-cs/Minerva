import {
  designIframeRefAtom,
  selectedDesignElementsAtom,
} from "@/atoms/previewAtoms";
import { useAtom, useAtomValue } from "jotai";
import { MousePointerSquareDashed, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SelectedDesignElementsDisplay() {
  const [selectedDesignElements, setSelectedDesignElements] = useAtom(
    selectedDesignElementsAtom,
  );
  const designIframeRef = useAtomValue(designIframeRefAtom);

  const clearSelectionInCanvas = () => {
    if (designIframeRef?.contentWindow) {
      designIframeRef.contentWindow.postMessage(
        { type: "dyad-design:clear-selection" },
        "*",
      );
    }
  };

  const handleRemoveElement = (index: number) => {
    const next = selectedDesignElements.filter((_, i) => i !== index);
    setSelectedDesignElements(next);
    if (next.length === 0) {
      clearSelectionInCanvas();
    }
  };

  const handleClearAll = () => {
    setSelectedDesignElements([]);
    clearSelectionInCanvas();
  };

  if (selectedDesignElements.length === 0) {
    return null;
  }

  return (
    <div
      className="max-h-[180px] overflow-y-auto p-2 pb-1"
      data-testid="selected-design-element-display"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">
          Selected Element ({selectedDesignElements.length})
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={handleClearAll}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              />
            }
          >
            Clear
          </TooltipTrigger>
          <TooltipContent>Clear selected design element</TooltipContent>
        </Tooltip>
      </div>
      {selectedDesignElements.map((element, index) => (
        <div
          key={`${element.draftId}:${element.dyadId}`}
          className="mb-1 last:mb-0"
        >
          <div className="flex items-center justify-between rounded-md bg-sky-600/10 px-2 py-1 text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <MousePointerSquareDashed
                size={16}
                className="flex-shrink-0 text-sky-700"
              />
              <div className="flex flex-col overflow-hidden">
                <span
                  className="truncate font-medium text-sky-900"
                  title={element.tagName}
                >
                  {element.tagName}
                </span>
                <span
                  className="truncate text-xs text-sky-800/80"
                  title={element.text || element.dyadId}
                >
                  {element.text || element.dyadId}
                </span>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => handleRemoveElement(index)}
                    aria-label="Deselect design element"
                    className="ml-2 flex-shrink-0 rounded-full p-0.5 hover:bg-sky-600/20"
                  />
                }
              >
                <X size={18} className="text-sky-700" />
              </TooltipTrigger>
              <TooltipContent>Deselect design element</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
}
