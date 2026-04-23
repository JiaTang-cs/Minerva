import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { designClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function useDraftComponents({
  flowId,
  enabled = true,
}: {
  flowId: string | null | undefined;
  enabled?: boolean;
}) {
  const appId = useAtomValue(selectedAppIdAtom);

  return useQuery({
    queryKey: queryKeys.design.components({
      appId: appId ?? null,
      flowId: flowId ?? null,
    }),
    queryFn: async () => {
      if (!appId || !flowId) return [];
      return designClient.listDraftComponents({ appId, flowId });
    },
    enabled: !!appId && !!flowId && enabled,
    staleTime: 1000 * 30,
  });
}
