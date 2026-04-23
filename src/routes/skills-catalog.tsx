import { z } from "zod";
import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import SkillCatalogDetailPage from "../pages/skill-catalog-detail";

export const skillsCatalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills/catalog",
  component: SkillCatalogDetailPage,
  validateSearch: z.object({
    source: z.string().min(1),
    skillId: z.string().min(1),
    name: z.string().optional(),
    installs: z.coerce.number().optional(),
    sourceUrl: z.string().optional(),
    query: z.string().optional(),
  }),
});
