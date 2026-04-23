import type {
  DesignDraft,
  DesignFlow,
  DesignFlowPage,
  DraftComponent,
} from "@/ipc/types";
import { getInternalRelativeSubdirPath } from "../utils/internal_app_dir";

export function createBuildFromDesignPrompt(params: {
  draft: DesignDraft;
  flow: DesignFlow | null;
  flowPages: DesignFlowPage[];
  components: DraftComponent[];
}): string {
  const { draft, flow, flowPages, components } = params;
  const draftsDir = getInternalRelativeSubdirPath("designs/drafts");
  const flowsDir = getInternalRelativeSubdirPath("designs/flows");
  const flowPagesDir = getInternalRelativeSubdirPath("designs/flow-pages");
  const componentsDir = getInternalRelativeSubdirPath("designs/components");
  const draftPath = `${draftsDir}/${draft.id}.json`;
  const flowPath = flow ? `${flowsDir}/${flow.id}.json` : null;

  const pageSummary =
    flowPages.length > 0
      ? flowPages
          .map(
            (page, index) =>
              `${index + 1}. ${page.title} (${page.role}, status: ${page.status}, file: \`${flowPagesDir}/${page.id}.json\`, draft: \`${draftsDir}/${page.draftId}.json\`)`,
          )
          .join("\n")
      : "No additional flow pages were generated.";

  const componentSummary =
    components.length > 0
      ? components
          .map(
            (component, index) =>
              `${index + 1}. ${component.name} (file: \`${componentsDir}/${component.id}.json\`)`,
          )
          .join("\n")
      : "No reusable components were extracted.";

  return `Build a complete application from the saved design flow.

## ${draft.title}

Brief: ${draft.brief || "No brief provided"}
Primary device: ${draft.deviceMode}
Root design draft file: \`${draftPath}\`
${flowPath ? `Design flow file: \`${flowPath}\`` : "Design flow file: none"}

Read the design data from the project's .minerva directory instead of relying on a large inlined HTML handoff.

Start with these files:
- Root design draft: \`${draftPath}\`
${flowPath ? `- Flow manifest: \`${flowPath}\`` : ""}
- Flow pages directory: \`${flowPagesDir}\`
- Reusable components directory: \`${componentsDir}\`

Implementation guidance:
- Use the root design draft as the primary visual source of truth
- Read the flow manifest and flow page records to understand the full multi-page structure
- Read reusable component files first when shared UI is involved
- Reuse the saved design system and shared sections instead of reinventing them from scratch
- Only read the specific draft/component files you need while implementing

Saved flow pages:
${pageSummary}

Saved reusable components:
${componentSummary}

Use the saved design files as the visual and structural source of truth while implementing the app.
Do not continue editing the design files unless implementation work truly requires syncing them.
Start building the application now.`;
}
