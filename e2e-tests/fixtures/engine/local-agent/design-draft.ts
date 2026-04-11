import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Task Mobile Design</title>
    <style>
      :root {
        --bg: #f7f1e7;
        --card: #ffffff;
        --ink: #1f2937;
        --accent: #6d5efc;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, #f8f2e9 0%, #f3ede4 100%);
        font-family: Arial, sans-serif;
        color: var(--ink);
      }

      main {
        padding: 24px;
      }

      .hero {
        border-radius: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #6d5efc 0%, #8b7bff 100%);
        color: white;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero" data-dyad-id="hero-card">
        <h1>Task Mobile</h1>
        <p>Focus on the next thing that matters.</p>
      </section>
    </main>
  </body>
</html>`;

export const fixture: LocalAgentFixture = {
  description: "Create an initial design draft for design mode",
  turns: [
    {
      text: "Here's the first design draft.",
      toolCalls: [
        {
          name: "create_design_draft",
          args: {
            title: "Task Mobile Design",
            brief: "A focused mobile task manager",
            deviceMode: "mobile",
            html,
          },
        },
      ],
    },
  ],
};
