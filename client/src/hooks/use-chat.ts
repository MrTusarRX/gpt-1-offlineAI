import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { z } from "zod";

type ChatInput = z.infer<typeof api.chat.send.input>;

export function useChatHistory() {
  return useQuery({
    queryKey: [api.chat.history.path],
    queryFn: async () => {
      const res = await fetch(api.chat.history.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chat history");
      return api.chat.history.responses[200].parse(await res.json());
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ChatInput) => {
      const validated = api.chat.send.input.parse(data);
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 503) {
          const error = api.chat.send.responses[503].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to send message");
      }
      return api.chat.send.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.history.path] });
    },
  });
}

export function useClearChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.chat.clear.path, {
        method: api.chat.clear.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clear chat");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.history.path] });
    },
  });
}
