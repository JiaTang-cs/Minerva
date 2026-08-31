import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { processNumericValue } from "@/utils/style-utils";
import {
  getUniformAxisValue,
  toEditableColor,
  toEditableLengthValue,
  type SelectedElementSnapshot,
  type SelectedElementStyles,
} from "./designCanvasUtils";

type LayoutOption = {
  label: string;
  value: string;
  icon: React.ReactNode;
};

type SpacingMode = "all" | "axis" | "individual";
type SpacingSide = "top" | "right" | "bottom" | "left";

function InspectorSegmentedRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: LayoutOption[];
}) {
  return (
    <div className="flex items-center rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
      <div className="w-[64px] shrink-0 text-[13px] font-medium text-slate-600">
        {label}
      </div>
      <div className="ml-2 flex h-8 flex-1 items-center justify-center gap-1 rounded-[12px] bg-muted p-1">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-6 min-w-0 flex-1 items-center justify-center rounded-[10px] transition-colors",
                isActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-400 hover:text-slate-600",
              )}
              aria-label={option.label}
              title={option.label}
            >
              {option.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InspectorValueRow({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-600">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-5 w-10 border-0 bg-transparent px-0 py-0 text-right text-[12px] font-semibold text-slate-900 shadow-none focus-visible:ring-0"
        />
        <span className="text-[11px] text-slate-400">px</span>
      </div>
    </div>
  );
}

function SpacingSideIcon({ side }: { side: SpacingSide }) {
  const indicatorClass =
    side === "top"
      ? "top-0 left-1/2 h-[2px] w-4 -translate-x-1/2"
      : side === "right"
        ? "top-1/2 right-0 h-4 w-[2px] -translate-y-1/2"
        : side === "bottom"
          ? "bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2"
          : "top-1/2 left-0 h-4 w-[2px] -translate-y-1/2";

  return (
    <div className="relative h-4 w-4">
      <div
        className={cn("absolute rounded-full bg-slate-400", indicatorClass)}
      />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-slate-300 bg-white" />
    </div>
  );
}

function InspectorQuadrantValueCard({
  id,
  side,
  value,
  onChange,
}: {
  id: string;
  side: SpacingSide;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-2 shadow-xs">
      <Label htmlFor={id} className="flex items-center">
        <SpacingSideIcon side={side} />
      </Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-5 w-9 border-0 bg-transparent px-0 py-0 text-right text-[12px] font-semibold text-slate-900 shadow-none focus-visible:ring-0"
        />
        <span className="text-[11px] text-slate-400">px</span>
      </div>
    </div>
  );
}

function SquareIcon() {
  return <div className="h-4 w-4 rounded-[3px] border-2 border-current" />;
}

function ColumnsIcon() {
  return (
    <div className="flex items-center gap-[2px]">
      <span className="h-4 w-[3px] rounded-full bg-current" />
      <span className="h-4 w-[3px] rounded-full bg-current" />
      <span className="h-4 w-[3px] rounded-full bg-current" />
    </div>
  );
}

function HiddenIcon() {
  return (
    <div className="relative h-4 w-4">
      <div className="absolute inset-x-[2px] top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-current" />
      <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rotate-45 rounded-full bg-current" />
    </div>
  );
}

function HorizontalAlignIcon({
  align,
}: {
  align: "start" | "center" | "end" | "stretch";
}) {
  const wrapperClass =
    align === "start"
      ? "items-start"
      : align === "center"
        ? "items-center"
        : align === "end"
          ? "items-end"
          : "items-stretch";

  return (
    <div className={cn("flex w-4 flex-col gap-[2px]", wrapperClass)}>
      <span className="h-[3px] w-3 rounded-full bg-current" />
      <span className="h-[3px] w-4 rounded-full bg-current" />
      <span className="h-[3px] w-3 rounded-full bg-current" />
    </div>
  );
}

function VerticalAlignIcon({ align }: { align: "start" | "center" | "end" }) {
  const wrapperClass =
    align === "start"
      ? "items-start"
      : align === "center"
        ? "items-center"
        : "items-end";

  return (
    <div className={cn("flex h-4 items-end gap-[2px]", wrapperClass)}>
      <span className="h-4 w-[3px] rounded-full bg-current" />
      <span className="h-3 w-[3px] rounded-full bg-current" />
      <span className="h-3.5 w-[3px] rounded-full bg-current" />
    </div>
  );
}

function PaddingAxisIcon() {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <span className="h-[3px] w-4 rounded-full bg-current" />
      <span className="h-[3px] w-4 rounded-full bg-current" />
    </div>
  );
}

function GridIcon() {
  return (
    <div className="grid grid-cols-2 gap-[2px]">
      <span className="h-[6px] w-[6px] rounded-[2px] border-2 border-current" />
      <span className="h-[6px] w-[6px] rounded-[2px] border-2 border-current" />
      <span className="h-[6px] w-[6px] rounded-[2px] border-2 border-current" />
      <span className="h-[6px] w-[6px] rounded-[2px] border-2 border-current" />
    </div>
  );
}

function getSpacingMode(
  styles: SelectedElementStyles | undefined,
): SpacingMode {
  const top = styles?.paddingTop ?? "";
  const right = styles?.paddingRight ?? "";
  const bottom = styles?.paddingBottom ?? "";
  const left = styles?.paddingLeft ?? "";

  if (top && top === right && top === bottom && top === left) {
    return "all";
  }

  if ((left || right || top || bottom) && left === right && top === bottom) {
    return "axis";
  }

  return "axis";
}

export function LayoutInspector({
  selectedElement,
  onApplyStyles,
}: {
  selectedElement: SelectedElementSnapshot | null;
  onApplyStyles: (styles: Record<string, string>) => void;
}) {
  const styles = selectedElement?.styles;
  const [paddingMode, setPaddingMode] = useState<SpacingMode>("axis");
  const [marginMode, setMarginMode] = useState<SpacingMode>("axis");

  useEffect(() => {
    setPaddingMode(getSpacingMode(styles));
    setMarginMode(() => {
      const top = styles?.marginTop ?? "";
      const right = styles?.marginRight ?? "";
      const bottom = styles?.marginBottom ?? "";
      const left = styles?.marginLeft ?? "";

      if (top && top === right && top === bottom && top === left) {
        return "all";
      }

      if (
        (left || right || top || bottom) &&
        left === right &&
        top === bottom
      ) {
        return "axis";
      }

      return "axis";
    });
  }, [styles]);

  const displayOptions: LayoutOption[] = [
    { label: "Block", value: "block", icon: <SquareIcon /> },
    { label: "Flex", value: "flex", icon: <ColumnsIcon /> },
    { label: "Hidden", value: "none", icon: <HiddenIcon /> },
  ];

  const justifyOptions: LayoutOption[] = [
    {
      label: "Start",
      value: "flex-start",
      icon: <HorizontalAlignIcon align="start" />,
    },
    {
      label: "Center",
      value: "center",
      icon: <HorizontalAlignIcon align="center" />,
    },
    {
      label: "End",
      value: "flex-end",
      icon: <HorizontalAlignIcon align="end" />,
    },
    {
      label: "Stretch",
      value: "space-between",
      icon: <HorizontalAlignIcon align="stretch" />,
    },
  ];

  const alignOptions: LayoutOption[] = [
    {
      label: "Top",
      value: "flex-start",
      icon: <VerticalAlignIcon align="start" />,
    },
    {
      label: "Center",
      value: "center",
      icon: <VerticalAlignIcon align="center" />,
    },
    {
      label: "Bottom",
      value: "flex-end",
      icon: <VerticalAlignIcon align="end" />,
    },
  ];

  const uniformPadding = toEditableLengthValue(styles?.paddingTop ?? "");
  const horizontalPadding = getUniformAxisValue(
    styles?.paddingLeft ?? "",
    styles?.paddingRight ?? "",
  );
  const verticalPadding = getUniformAxisValue(
    styles?.paddingTop ?? "",
    styles?.paddingBottom ?? "",
  );
  const uniformMargin = toEditableLengthValue(styles?.marginTop ?? "");
  const horizontalMargin = getUniformAxisValue(
    styles?.marginLeft ?? "",
    styles?.marginRight ?? "",
  );
  const verticalMargin = getUniformAxisValue(
    styles?.marginTop ?? "",
    styles?.marginBottom ?? "",
  );

  return (
    <div className="w-[280px] rounded-[26px] border border-border bg-white/98 p-3 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="max-h-[270px] overflow-y-auto pr-1 [scrollbar-color:#d9d4cc_transparent] [scrollbar-width:thin]">
        <div className="grid grid-cols-1 gap-2">
          <InspectorSegmentedRow
            label="Display"
            value={styles?.display ?? "block"}
            onChange={(value) => onApplyStyles({ display: value })}
            options={displayOptions}
          />
          <InspectorSegmentedRow
            label="H Align"
            value={
              styles?.justifyContent === "normal"
                ? "flex-start"
                : (styles?.justifyContent ?? "flex-start")
            }
            onChange={(value) => onApplyStyles({ justifyContent: value })}
            options={justifyOptions}
          />
          <InspectorSegmentedRow
            label="V Align"
            value={
              styles?.alignItems === "normal"
                ? "flex-start"
                : (styles?.alignItems ?? "flex-start")
            }
            onChange={(value) => onApplyStyles({ alignItems: value })}
            options={alignOptions}
          />
          <div className="rounded-[18px] border border-border bg-muted/30 p-2">
            <div className="mb-2 flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
              <div className="text-[13px] font-medium text-slate-600">
                Padding
              </div>
              <div className="flex items-center gap-1 rounded-[12px] bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setPaddingMode("all")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    paddingMode === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Uniform padding"
                >
                  <SquareIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setPaddingMode("axis")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    paddingMode === "axis"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Horizontal and vertical padding"
                >
                  <PaddingAxisIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setPaddingMode("individual")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    paddingMode === "individual"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Padding per side"
                >
                  <GridIcon />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {paddingMode === "all" ? (
                <InspectorValueRow
                  label="All"
                  id="design-padding-all"
                  value={uniformPadding}
                  onChange={(value) => {
                    const next = value ? processNumericValue(value) : "";
                    onApplyStyles({
                      paddingTop: next,
                      paddingRight: next,
                      paddingBottom: next,
                      paddingLeft: next,
                    });
                  }}
                />
              ) : null}
              {paddingMode === "axis" ? (
                <>
                  <InspectorValueRow
                    label="Y"
                    id="design-padding-y"
                    value={verticalPadding}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingTop: value ? processNumericValue(value) : "",
                        paddingBottom: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorValueRow
                    label="X"
                    id="design-padding-x"
                    value={horizontalPadding}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingLeft: value ? processNumericValue(value) : "",
                        paddingRight: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                </>
              ) : null}
              {paddingMode === "individual" ? (
                <div className="grid grid-cols-2 gap-2">
                  <InspectorQuadrantValueCard
                    id="design-padding-top"
                    side="top"
                    value={toEditableLengthValue(styles?.paddingTop ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingTop: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-padding-right"
                    side="right"
                    value={toEditableLengthValue(styles?.paddingRight ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingRight: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-padding-bottom"
                    side="bottom"
                    value={toEditableLengthValue(styles?.paddingBottom ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingBottom: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-padding-left"
                    side="left"
                    value={toEditableLengthValue(styles?.paddingLeft ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        paddingLeft: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-[18px] border border-border bg-muted/30 p-2">
            <div className="mb-2 flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
              <div className="text-[13px] font-medium text-slate-600">
                Margin
              </div>
              <div className="flex items-center gap-1 rounded-[12px] bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setMarginMode("all")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    marginMode === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Uniform margin"
                >
                  <SquareIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setMarginMode("axis")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    marginMode === "axis"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Horizontal and vertical margin"
                >
                  <PaddingAxisIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setMarginMode("individual")}
                  className={cn(
                    "flex h-6 w-8 items-center justify-center rounded-[10px] transition-colors",
                    marginMode === "individual"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                  aria-label="Margin per side"
                >
                  <GridIcon />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {marginMode === "all" ? (
                <InspectorValueRow
                  label="All"
                  id="design-margin-all"
                  value={uniformMargin}
                  onChange={(value) => {
                    const next = value ? processNumericValue(value) : "";
                    onApplyStyles({
                      marginTop: next,
                      marginRight: next,
                      marginBottom: next,
                      marginLeft: next,
                    });
                  }}
                />
              ) : null}
              {marginMode === "axis" ? (
                <>
                  <InspectorValueRow
                    label="Y"
                    id="design-margin-y"
                    value={verticalMargin}
                    onChange={(value) =>
                      onApplyStyles({
                        marginTop: value ? processNumericValue(value) : "",
                        marginBottom: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorValueRow
                    label="X"
                    id="design-margin-x"
                    value={horizontalMargin}
                    onChange={(value) =>
                      onApplyStyles({
                        marginLeft: value ? processNumericValue(value) : "",
                        marginRight: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                </>
              ) : null}
              {marginMode === "individual" ? (
                <div className="grid grid-cols-2 gap-2">
                  <InspectorQuadrantValueCard
                    id="design-margin-top"
                    side="top"
                    value={toEditableLengthValue(styles?.marginTop ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        marginTop: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-margin-right"
                    side="right"
                    value={toEditableLengthValue(styles?.marginRight ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        marginRight: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-margin-bottom"
                    side="bottom"
                    value={toEditableLengthValue(styles?.marginBottom ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        marginBottom: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                  <InspectorQuadrantValueCard
                    id="design-margin-left"
                    side="left"
                    value={toEditableLengthValue(styles?.marginLeft ?? "")}
                    onChange={(value) =>
                      onApplyStyles({
                        marginLeft: value ? processNumericValue(value) : "",
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StyleInspector({
  selectedElement,
  onApplyStyles,
}: {
  selectedElement: SelectedElementSnapshot | null;
  onApplyStyles: (styles: Record<string, string>) => void;
}) {
  const styles = selectedElement?.styles;
  const borderWidthValue = toEditableLengthValue(styles?.borderWidth ?? "");
  const borderRadiusValue = toEditableLengthValue(styles?.borderRadius ?? "");

  return (
    <div className="w-[280px] rounded-[26px] border border-border bg-white/98 p-4 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
          <Label
            htmlFor="design-text-color"
            className="text-[13px] font-medium text-slate-600"
          >
            Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={toEditableColor(styles?.color ?? "", "#111827")}
              onChange={(event) => onApplyStyles({ color: event.target.value })}
              className="h-5 w-[64px] border-0 bg-transparent px-0 py-0 text-right text-[11px] font-medium text-slate-500 shadow-none focus-visible:ring-0"
            />
            <label
              htmlFor="design-text-color"
              className="relative block size-8 cursor-pointer overflow-hidden rounded-full border border-border shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
              style={{
                backgroundColor: toEditableColor(
                  styles?.color ?? "",
                  "#111827",
                ),
              }}
            >
              <input
                id="design-text-color"
                type="color"
                value={toEditableColor(styles?.color ?? "", "#111827")}
                onChange={(event) =>
                  onApplyStyles({ color: event.target.value })
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
          <Label
            htmlFor="design-background-color"
            className="text-[13px] font-medium text-slate-600"
          >
            Background
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={toEditableColor(styles?.backgroundColor ?? "", "#ffffff")}
              onChange={(event) =>
                onApplyStyles({ backgroundColor: event.target.value })
              }
              className="h-5 w-[64px] border-0 bg-transparent px-0 py-0 text-right text-[11px] font-medium text-slate-500 shadow-none focus-visible:ring-0"
            />
            <label
              htmlFor="design-background-color"
              className="relative block size-8 cursor-pointer overflow-hidden rounded-full border border-border shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
              style={{
                backgroundColor: toEditableColor(
                  styles?.backgroundColor ?? "",
                  "#ffffff",
                ),
              }}
            >
              <input
                id="design-background-color"
                type="color"
                value={toEditableColor(
                  styles?.backgroundColor ?? "",
                  "#ffffff",
                )}
                onChange={(event) =>
                  onApplyStyles({ backgroundColor: event.target.value })
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[14px] border border-border bg-white px-3 py-1.5 shadow-xs">
          <Label
            htmlFor="design-border-color"
            className="text-[13px] font-medium text-slate-600"
          >
            Border Color
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={toEditableColor(styles?.borderColor ?? "", "#111827")}
              onChange={(event) =>
                onApplyStyles({ borderColor: event.target.value })
              }
              className="h-5 w-[64px] border-0 bg-transparent px-0 py-0 text-right text-[11px] font-medium text-slate-500 shadow-none focus-visible:ring-0"
            />
            <label
              htmlFor="design-border-color"
              className="relative block size-8 cursor-pointer overflow-hidden rounded-full border border-border shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
              style={{
                backgroundColor: toEditableColor(
                  styles?.borderColor ?? "",
                  "#111827",
                ),
              }}
            >
              <input
                id="design-border-color"
                type="color"
                value={toEditableColor(styles?.borderColor ?? "", "#111827")}
                onChange={(event) =>
                  onApplyStyles({ borderColor: event.target.value })
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[16px] border border-border bg-white px-4 py-2 shadow-xs">
          <Label
            htmlFor="design-radius"
            className="text-[13px] font-medium text-slate-600"
          >
            Radius
          </Label>
          <div className="flex items-center gap-1">
            <Input
              id="design-radius"
              type="number"
              value={borderRadiusValue}
              onChange={(event) =>
                onApplyStyles({
                  borderRadius: event.target.value
                    ? processNumericValue(event.target.value)
                    : "",
                })
              }
              className="h-6 w-11 border-0 bg-transparent px-0 py-0 text-right text-[13px] font-semibold text-slate-900 shadow-none focus-visible:ring-0"
            />
            <span className="text-[11px] text-slate-400">px</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[16px] border border-border bg-white px-4 py-2 shadow-xs">
          <Label
            htmlFor="design-border-width"
            className="text-[13px] font-medium text-slate-600"
          >
            Border
          </Label>
          <div className="flex items-center gap-1">
            <Input
              id="design-border-width"
              type="number"
              value={borderWidthValue}
              onChange={(event) =>
                onApplyStyles({
                  borderWidth: event.target.value
                    ? processNumericValue(event.target.value)
                    : "",
                })
              }
              className="h-6 w-11 border-0 bg-transparent px-0 py-0 text-right text-[13px] font-semibold text-slate-900 shadow-none focus-visible:ring-0"
            />
            <span className="text-[11px] text-slate-400">px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
