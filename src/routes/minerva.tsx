import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import MinervaPage from "@/pages/minerva";

export const minervaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/minerva",
  component: MinervaPage,
});
