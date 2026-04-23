import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { designClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function useDesignFlowPages({
  flowId,
  enabled = true,
}: {
  flowId: string | null | undefined;
  enabled?: boolean;
}) {
  const appId = useAtomValue(selectedAppIdAtom);

  return useQuery({
    queryKey: queryKeys.design.flowPages({
      appId: appId ?? null,
      flowId: flowId ?? null,
    }),
    queryFn: async () => {
      if (!appId || !flowId) return [];
      return designClient.listFlowPages({ appId, flowId });
    },
    enabled: !!appId && !!flowId && enabled,
    staleTime: 1000 * 30,
  });
}
