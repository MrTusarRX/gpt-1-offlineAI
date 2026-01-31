import { z } from "zod";
import { insertModelSchema, insertChatSchema, insertTrainingFileSchema } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  files: {
    upload: {
      method: "POST" as const,
      path: "/api/files",
      input: z.object({
        filename: z.string(),
        content: z.string(),
      }),
      responses: {
        201: z.object({ id: z.number(), filename: z.string() }),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/files",
      responses: {
        200: z.array(z.object({ id: z.number(), filename: z.string(), uploadedAt: z.string() })),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/files/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  models: {
    train: {
      method: "POST" as const,
      path: "/api/models/train",
      input: insertModelSchema.extend({
        fileIds: z.array(z.number()),
      }),
      responses: {
        202: z.object({ message: z.string(), modelId: z.number() }),
        400: errorSchemas.validation,
      },
    },
    status: {
      method: "GET" as const,
      path: "/api/models/status",
      responses: {
        200: z.object({
          active: z.boolean(),
          modelId: z.number().optional(),
          status: z.string().optional(),
          currentEpoch: z.number().optional(),
          totalEpochs: z.number().optional(),
          loss: z.number().optional(),
          fileIds: z.array(z.number()).optional(),
        }),
      },
    },
  },
  chat: {
    send: {
      method: "POST" as const,
      path: "/api/chat",
      input: z.object({
        message: z.string(),
        temperature: z.number().optional().default(0.7),
      }),
      responses: {
        200: z.object({ reply: z.string() }),
        503: z.object({ message: z.string() }),
      },
    },
    history: {
      method: "GET" as const,
      path: "/api/chat",
      responses: {
        200: z.array(z.object({ role: z.string(), content: z.string(), timestamp: z.string() })),
      },
    },
    clear: {
      method: "DELETE" as const,
      path: "/api/chat",
      responses: {
        204: z.void(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
