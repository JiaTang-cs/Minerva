import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

export const fixture: LocalAgentFixture = {
  description: "Exit design mode after the user clicks build",
  turns: [
    {
      text: "Starting the build from this design.",
      toolCalls: [
        {
          name: "exit_design",
          args: {
            confirmation: true,
          },
        },
      ],
    },
  ],
};
