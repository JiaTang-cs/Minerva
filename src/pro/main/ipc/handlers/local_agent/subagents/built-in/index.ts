import { exploreSubagent } from "./exploreSubagent";
import { workerSubagent } from "./workerSubagent";

export const BUILT_IN_SUBAGENTS = [workerSubagent, exploreSubagent] as const;
