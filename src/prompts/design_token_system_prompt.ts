export const DESIGN_TOKEN_SYSTEM_PROMPT = `
<design_tokens_system>

## Tailwind CSS Design Tokens

The design system uses semantic color tokens that map to theme variables. Use these tokens consistently across all generated HTML.

### Color Tokens

#### Background Tokens
- \`bg-background\`: Primary page background
- \`bg-foreground\`: Inverted surface background when needed for contrast
- \`bg-card\`: Card and container background
- \`bg-popover\`: Popover and dropdown background
- \`bg-muted\`: Muted or secondary background
- \`bg-accent\`: Accent background for highlights and selected states

#### Text Tokens
- \`text-foreground\`: Primary text color
- \`text-muted-foreground\`: Secondary or muted text
- \`text-primary\`: Primary brand text
- \`text-secondary\`: Secondary brand text
- \`text-destructive\`: Error or destructive text
- \`text-success\`: Success state text
- \`text-info\`: Informational text
- \`text-warning\`: Warning text
- \`text-primary-foreground\`: Text on primary surfaces
- \`text-secondary-foreground\`: Text on secondary surfaces
- \`text-accent-foreground\`: Text on accent surfaces
- \`text-destructive-foreground\`: Text on destructive surfaces

#### Component Tokens
- \`bg-primary\`: Primary button or emphasis surface
- \`bg-secondary\`: Secondary button or surface
- \`bg-destructive\`: Destructive action surface
- \`bg-success\`: Success state surface
- \`bg-warning\`: Warning state surface
- \`bg-info\`: Informational state surface

#### Border Tokens
- \`border-border\`: Default border and divider color
- \`border-input\`: Input border color
- \`border-ring\`: Focus ring color

### Usage Rules

1. Never use hardcoded colors such as hex, rgb, rgba, hsl, or named colors.
2. Never use Tailwind palette classes such as \`bg-blue-500\`, \`text-slate-900\`, or \`border-gray-200\`.
3. Always prefer semantic tokens in utility classes.

Correct examples:
\`\`\`html
<div class="bg-background text-foreground border border-border">
<button class="bg-primary text-primary-foreground hover:bg-primary/80">
<div class="bg-card border border-border rounded-lg">
\`\`\`

Wrong examples:
\`\`\`html
<div class="bg-white text-black border border-gray-300">
<button class="bg-blue-500 text-white hover:bg-blue-600">
\`\`\`

### Custom CSS Rules

For custom CSS, always reference theme variables:

\`\`\`css
background-color: var(--background);
color: var(--foreground);
border-color: var(--border);
\`\`\`

Do not write:

\`\`\`css
background-color: #ffffff;
color: #000000;
border-color: #e5e7eb;
\`\`\`

### State and Opacity Rules

- Opacity modifiers are allowed with semantic tokens, for example \`bg-primary/10\` or \`text-muted-foreground/70\`
- State variants should remain semantic, for example \`hover:bg-primary/80\` and \`focus:ring-ring\`

### Common Token Combinations

- Primary button: \`bg-primary text-primary-foreground hover:bg-primary/80\`
- Secondary button: \`bg-secondary text-secondary-foreground hover:bg-secondary/80\`
- Destructive button: \`bg-destructive text-destructive-foreground hover:bg-destructive/80\`
- Card container: \`bg-card border border-border rounded-lg\`
- Input field: \`bg-background border border-input text-foreground focus:border-primary focus:ring-ring\`
- Muted text: \`text-muted-foreground\`
- Divider: \`border-t border-border\`
- Success message: \`bg-success/10 text-success border border-success/30\`
- Warning message: \`bg-warning/10 text-warning border border-warning/30\`
- Destructive message: \`bg-destructive/10 text-destructive border border-destructive/30\`

### Dark Mode

These semantic tokens should work in both light and dark themes automatically. Do not special-case palette colors. Rely on the semantic token system.

</design_tokens_system>
`;
