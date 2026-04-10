import { atom } from "jotai";
import type { AskUserQuestionPayload } from "@/ipc/types";

export const pendingAskUserQuestionAtom = atom<
  Map<number, AskUserQuestionPayload>
>(new Map());

export const askUserQuestionSubmittedChatIdsAtom = atom<
  Map<number, "visible" | "fading">
>(new Map());
