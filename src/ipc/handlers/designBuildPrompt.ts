import type { DesignDraft } from "@/ipc/types";

export function createBuildFromDesignPrompt(draft: DesignDraft): string {
  const designPath = `.dyad/designs/${draft.id}.json`;

  return `Build a complete application from the following design draft:

## ${draft.title}

Brief: ${draft.brief || "No brief provided"}
Primary device: ${draft.deviceMode}
Design draft path: \`${designPath}\`

HTML design draft:
\`\`\`html
${draft.html}
\`\`\`

Use this design draft as the visual and structural source of truth while implementing the app.
Do not continue editing the design draft unless implementation work requires updating the saved draft as part of the build process.
Start building the application now.`;
}
