import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { designClient } from "@/ipc/types";

export function useDesignDraft({ enabled = true }: { enabled?: boolean } = {}) {
  const appId = useAtomValue(selectedAppIdAtom);
  const chatId = useAtomValue(selectedChatIdAtom);

  const query = useQuery({
    queryKey: ["design-draft", "forChat", appId ?? null, chatId ?? null],
    queryFn: async () => {
      if (!appId || !chatId) return null;
      return designClient.getDraftForChat({ appId, chatId });
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
