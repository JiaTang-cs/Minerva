import { z } from "zod";
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import SkillsPage from "../pages/skills";

export const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: SkillsPage,
  validateSearch: z.object({
    q: z.string().optional(),
  }),
});
