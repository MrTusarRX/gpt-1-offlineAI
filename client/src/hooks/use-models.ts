import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { z } from "zod";

type TrainInput = z.infer<typeof api.models.train.input>;

export function useModelStatus() {
  return useQuery({
    queryKey: [api.models.status.path],
    queryFn: async () => {
      const res = await fetch(api.models.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch status");
      return api.models.status.responses[200].parse(await res.json());
    },
    refetchInterval: (query) => {
      return query.state.data?.active ? 1000 : 10000;
    },
  });
}

export function useTrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TrainInput) => {
      const validated = api.models.train.input.parse(data);
      const res = await fetch(api.models.train.path, {
        method: api.models.train.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.models.train.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to start training");
      }
      return api.models.train.responses[202].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.models.status.path] });
    },
  });
}
