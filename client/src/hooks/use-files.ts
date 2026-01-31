import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { z } from "zod";

type FileInput = z.infer<typeof api.files.upload.input>;

export function useFiles() {
  return useQuery({
    queryKey: [api.files.list.path],
    queryFn: async () => {
      const res = await fetch(api.files.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch files");
      return api.files.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FileInput) => {
      const validated = api.files.upload.input.parse(data);
      const res = await fetch(api.files.upload.path, {
        method: api.files.upload.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.files.upload.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to upload file");
      }
      return api.files.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.files.delete.path, { id });
      const res = await fetch(url, {
        method: api.files.delete.method,
        credentials: "include",
      });

      if (!res.ok && res.status !== 404) {
        throw new Error("Failed to delete file");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
    },
  });
}
