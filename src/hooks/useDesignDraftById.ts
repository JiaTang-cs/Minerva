import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { designClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function useDesignDraftById({
  draftId,
  enabled = true,
}: {
  draftId: string | null | undefined;
  enabled?: boolean;
}) {
  const appId = useAtomValue(selectedAppIdAtom);

  return useQuery({
    queryKey: queryKeys.design.draftById({
      appId: appId ?? null,
      draftId: draftId ?? null,
    }),
    queryFn: async () => {
      if (!appId || !draftId) return null;
      return designClient.getDraft({ appId, draftId });
    },
    enabled: !!appId && !!draftId && enabled,
    staleTime: 1000 * 30,
  });
}
