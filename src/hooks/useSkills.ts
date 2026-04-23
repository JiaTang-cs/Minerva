import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function useSkills(appId: number | null) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.skills.list({ appId }),
    queryFn: () => ipc.skills.list({ appId }),
    meta: { showErrorToast: true },
  });

  const refreshMutation = useMutation({
    mutationFn: () => ipc.skills.refresh({ appId }),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(queryKeys.skills.list({ appId }), snapshot);
    },
    meta: { showErrorToast: true },
  });

  const installMutation = useMutation({
    mutationFn: (params: { source: string; skillId: string }) =>
      ipc.skills.install({
        appId,
        source: params.source,
        skillId: params.skillId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
    meta: { showErrorToast: true },
  });

  return {
    snapshot: listQuery.data,
    skills: listQuery.data?.skills ?? [],
    loadErrors: listQuery.data?.loadErrors ?? [],
    roots: listQuery.data?.roots,
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    refresh: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
    installSkill: installMutation.mutateAsync,
    isInstalling: installMutation.isPending,
  };
}

export function useSkillCatalogSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.skills.search({ query }),
    queryFn: () => ipc.skills.searchCatalog({ query }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
    meta: { showErrorToast: true },
  });
}

export function useCatalogSkillDetail(source?: string, skillId?: string) {
  return useQuery({
    queryKey: queryKeys.skills.detailCatalog({
      source: source ?? "",
      skillId: skillId ?? "",
    }),
    queryFn: () =>
      ipc.skills.getCatalogDetail({
        source: source!,
        skillId: skillId!,
      }),
    enabled: Boolean(source && skillId),
    staleTime: 5 * 60_000,
    meta: { showErrorToast: true },
  });
}
