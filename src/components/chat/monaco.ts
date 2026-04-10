import type * as Monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import { loadMonacoWithFallback } from "./monaco_loader";

type MonacoInstance = typeof Monaco;

const MONACO_VS_SOURCES = [
  "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
  "https://unpkg.com/monaco-editor@0.52.2/min/vs",
] as const;

const MONACO_SCRIPT_TIMEOUT_MS = 8000;
const MONACO_LOADER_SCRIPT_ATTR = "data-dyad-monaco-loader";

declare global {
  interface Window {
    monaco?: MonacoInstance;
    require?: {
      config: (config: { paths: { vs: string } }) => void;
      (
        modules: string[],
        onLoad: (value: MonacoInstance) => void,
        onError: (error: unknown) => void,
      ): void;
    };
  }
}

export const customLight: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: false,
  rules: [
    { token: "", foreground: "000000", background: "fffffe" },
    { token: "invalid", foreground: "cd3131" },
    { token: "emphasis", fontStyle: "italic" },
    { token: "strong", fontStyle: "bold" },

    { token: "variable", foreground: "001188" },
    { token: "variable.predefined", foreground: "4864AA" },
    { token: "constant", foreground: "dd0000" },
    { token: "comment", foreground: "008000" },
    { token: "number", foreground: "098658" },
    { token: "number.hex", foreground: "3030c0" },
    { token: "regexp", foreground: "800000" },
    { token: "annotation", foreground: "808080" },
    { token: "type", foreground: "008080" },

    { token: "delimiter", foreground: "000000" },
    { token: "delimiter.html", foreground: "383838" },
    { token: "delimiter.xml", foreground: "0000FF" },

    { token: "tag", foreground: "800000" },
    { token: "tag.id.pug", foreground: "4F76AC" },
    { token: "tag.class.pug", foreground: "4F76AC" },
    { token: "meta.scss", foreground: "800000" },
    { token: "metatag", foreground: "e00000" },
    { token: "metatag.content.html", foreground: "FF0000" },
    { token: "metatag.html", foreground: "808080" },
    { token: "metatag.xml", foreground: "808080" },
    { token: "metatag.php", fontStyle: "bold" },

    { token: "key", foreground: "863B00" },
    { token: "string.key.json", foreground: "A31515" },
    { token: "string.value.json", foreground: "0451A5" },

    { token: "attribute.name", foreground: "FF0000" },
    { token: "attribute.value", foreground: "0451A5" },
    { token: "attribute.value.number", foreground: "098658" },
    { token: "attribute.value.unit", foreground: "098658" },
    { token: "attribute.value.html", foreground: "0000FF" },
    { token: "attribute.value.xml", foreground: "0000FF" },

    { token: "string", foreground: "A31515" },
    { token: "string.html", foreground: "0000FF" },
    { token: "string.sql", foreground: "FF0000" },
    { token: "string.yaml", foreground: "0451A5" },

    { token: "keyword", foreground: "0000FF" },
    { token: "keyword.json", foreground: "0451A5" },
    { token: "keyword.flow", foreground: "AF00DB" },
    { token: "keyword.flow.scss", foreground: "0000FF" },

    { token: "operator.scss", foreground: "666666" },
    { token: "operator.sql", foreground: "778899" },
    { token: "operator.swift", foreground: "666666" },
    { token: "predefined.sql", foreground: "C700C7" },
  ],
  colors: {
    // surface
    "editor.background": "#f7f5ff",
    "minimap.background": "#f7f5ff",
    "editor.foreground": "#000000",
    "editor.inactiveSelectionBackground": "#E5EBF1",
    "editorIndentGuide.background1": "#D3D3D3",
    "editorIndentGuide.activeBackground1": "#939393",
    "editor.selectionHighlightBackground": "#ADD6FF4D",
  },
};

export const customDark: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: false,
  rules: [
    { token: "", foreground: "D4D4D4", background: "1E1E1E" },
    { token: "invalid", foreground: "f44747" },
    { token: "emphasis", fontStyle: "italic" },
    { token: "strong", fontStyle: "bold" },

    { token: "variable", foreground: "74B0DF" },
    { token: "variable.predefined", foreground: "4864AA" },
    { token: "variable.parameter", foreground: "9CDCFE" },
    { token: "constant", foreground: "569CD6" },
    { token: "comment", foreground: "608B4E" },
    { token: "number", foreground: "B5CEA8" },
    { token: "number.hex", foreground: "5BB498" },
    { token: "regexp", foreground: "B46695" },
    { token: "annotation", foreground: "cc6666" },
    { token: "type", foreground: "3DC9B0" },

    { token: "delimiter", foreground: "DCDCDC" },
    { token: "delimiter.html", foreground: "808080" },
    { token: "delimiter.xml", foreground: "808080" },

    { token: "tag", foreground: "569CD6" },
    { token: "tag.id.pug", foreground: "4F76AC" },
    { token: "tag.class.pug", foreground: "4F76AC" },
    { token: "meta.scss", foreground: "A79873" },
    { token: "meta.tag", foreground: "CE9178" },
    { token: "metatag", foreground: "DD6A6F" },
    { token: "metatag.content.html", foreground: "9CDCFE" },
    { token: "metatag.html", foreground: "569CD6" },
    { token: "metatag.xml", foreground: "569CD6" },
    { token: "metatag.php", fontStyle: "bold" },

    { token: "key", foreground: "9CDCFE" },
    { token: "string.key.json", foreground: "9CDCFE" },
    { token: "string.value.json", foreground: "CE9178" },

    { token: "attribute.name", foreground: "9CDCFE" },
    { token: "attribute.value", foreground: "CE9178" },
    { token: "attribute.value.number.css", foreground: "B5CEA8" },
    { token: "attribute.value.unit.css", foreground: "B5CEA8" },
    { token: "attribute.value.hex.css", foreground: "D4D4D4" },

    { token: "string", foreground: "CE9178" },
    { token: "string.sql", foreground: "FF0000" },

    { token: "keyword", foreground: "569CD6" },
    { token: "keyword.flow", foreground: "C586C0" },
    { token: "keyword.json", foreground: "CE9178" },
    { token: "keyword.flow.scss", foreground: "569CD6" },

    { token: "operator.scss", foreground: "909090" },
    { token: "operator.sql", foreground: "778899" },
    { token: "operator.swift", foreground: "909090" },
    { token: "predefined.sql", foreground: "FF00FF" },
  ],
  colors: {
    // surface
    "editor.background": "#131316",
    "minimap.background": "#131316",
    "editor.foreground": "#D4D4D4",
    "editor.inactiveSelectionBackground": "#3A3D41",
    "editorIndentGuide.background1": "#404040",
    "editorIndentGuide.activeBackground1": "#707070",
    "editor.selectionHighlightBackground": "#ADD6FF26",
  },
};

let themedMonaco: MonacoInstance | null = null;
let monacoReadyPromise: Promise<MonacoInstance> | null = null;

function applyDyadMonacoSetup(monaco: MonacoInstance) {
  if (themedMonaco === monaco) {
    return monaco;
  }

  monaco.editor.defineTheme("dyad-light", customLight);
  monaco.editor.defineTheme("dyad-dark", customDark);

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    jsx: monaco.languages.typescript.JsxEmit.React, // Enable JSX
  });
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    // Too noisy because we don't have the full TS environment.
    noSemanticValidation: true,
  });
  themedMonaco = monaco;

  return monaco;
}

function removeExistingLoaderScripts() {
  document
    .querySelectorAll(`script[${MONACO_LOADER_SCRIPT_ATTR}]`)
    .forEach((script) => script.remove());
}

function loadLoaderScript(vsPath: string): Promise<void> {
  if (typeof window.require === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(
        new Error(`Timed out while loading Monaco loader from ${vsPath}`),
      );
    }, MONACO_SCRIPT_TIMEOUT_MS);

    script.setAttribute(MONACO_LOADER_SCRIPT_ATTR, "true");
    script.src = `${vsPath}/loader.js`;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error(`Failed to load Monaco loader from ${vsPath}`));
    };

    document.body.appendChild(script);
  });
}

function loadMonacoFromVsPath(vsPath: string): Promise<MonacoInstance> {
  if (window.monaco?.editor) {
    return Promise.resolve(window.monaco);
  }

  removeExistingLoaderScripts();

  return loadLoaderScript(vsPath).then(
    () =>
      new Promise<MonacoInstance>((resolve, reject) => {
        const requireFn = window.require;

        if (!requireFn) {
          reject(new Error("Monaco loader script did not expose window.require"));
          return;
        }

        requireFn.config({ paths: { vs: vsPath } });
        requireFn(
          ["vs/editor/editor.main"],
          (monaco) => {
            window.monaco = monaco;
            resolve(monaco);
          },
          (error) => {
            reject(
              error instanceof Error
                ? error
                : new Error(`Failed to load Monaco editor.main from ${vsPath}`),
            );
          },
        );
      }),
  );
}

export function ensureMonacoReady(): Promise<MonacoInstance> {
  if (!monacoReadyPromise) {
    monacoReadyPromise = loadMonacoWithFallback({
      vsPaths: [...MONACO_VS_SOURCES],
      loadFromVsPath: loadMonacoFromVsPath,
      onPathSelected: (vsPath) => {
        loader.config({ paths: { vs: vsPath } });
      },
    }).then((monaco) => applyDyadMonacoSetup(monaco));
  }

  return monacoReadyPromise;
}
