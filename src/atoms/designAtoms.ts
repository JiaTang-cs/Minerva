import { atom } from "jotai";
import type { AskUserQuestionPayload } from "@/ipc/types";

export const pendingAskUserQuestionAtom = atom<
  Map<number, AskUserQuestionPayload>
>(new Map());

export const askUserQuestionSubmittedChatIdsAtom = atom<
  Map<number, "visible" | "fading">
>(new Map());

export interface PendingDesignBuild {
  chatId: number;
  draftId: string;
  sourceDesignChatId: number;
}

export interface DesignHandoffState {
  acceptedChatIds: Set<number>;
  transitioningChatIds: Set<number>;
}

export const pendingDesignBuildAtom = atom<PendingDesignBuild | null>(null);

export const designHandoffStateAtom = atom<DesignHandoffState>({
  acceptedChatIds: new Set<number>(),
  transitioningChatIds: new Set<number>(),
});
