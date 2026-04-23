import type { DesignDraft } from "@/ipc/types";
import { stripDesignEditorArtifactsForHandoff } from "@/shared/designDraftHtml";
import { getInternalRelativeSubdirPath } from "../utils/internal_app_dir";

export function createBuildFromDesignPrompt(draft: DesignDraft): string {
  const designPath = `${getInternalRelativeSubdirPath("designs")}/${draft.id}.json`;
  const cleanHtml = stripDesignEditorArtifactsForHandoff(draft.html);

  return `Build a complete application from the following design draft:

## ${draft.title}

Brief: ${draft.brief || "No brief provided"}
Primary device: ${draft.deviceMode}
Design draft path: \`${designPath}\`

HTML design draft:
\`\`\`html
${cleanHtml}
\`\`\`

Use this design draft as the visual and structural source of truth while implementing the app.
Do not continue editing the design draft unless implementation work requires updating the saved draft as part of the build process.
Start building the application now.`;
}
