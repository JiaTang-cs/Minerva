import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { designClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function useDesignFlow({ enabled = true }: { enabled?: boolean } = {}) {
  const appId = useAtomValue(selectedAppIdAtom);
  const chatId = useAtomValue(selectedChatIdAtom);

  const query = useQuery({
    queryKey: queryKeys.design.flowForChat({
      appId: appId ?? null,
      chatId: chatId ?? null,
    }),
    queryFn: async () => {
      if (!appId || !chatId) return null;
      return designClient.getFlowForChat({ appId, chatId });
    },
    enabled: !!appId && !!chatId && enabled,
    staleTime: 1000 * 30,
  });

  return {
    appId,
    chatId,
    ...query,
  };
}
