import { pgTable, text, serial, real, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const trainingFiles = pgTable("training_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("ready"),
  config: text("config").notNull(),
  currentEpoch: integer("current_epoch").default(0),
  totalEpochs: integer("total_epochs").default(10),
  lastLoss: real("last_loss"),
  accuracy: real("accuracy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  tokenizerData: text("tokenizer_data"),
  modelWeights: text("model_weights"),
});

export const trainingMetrics = pgTable("training_metrics", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  epoch: integer("epoch").notNull(),
  loss: real("loss").notNull(),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertTrainingFileSchema = createInsertSchema(trainingFiles).omit({ 
  id: true, 
  uploadedAt: true 
});

export const insertModelSchema = createInsertSchema(models).omit({ 
  id: true, 
  status: true,
  currentEpoch: true,
  totalEpochs: true,
  lastLoss: true,
  accuracy: true,
  createdAt: true,
  tokenizerData: true,
  modelWeights: true,
});

export const insertChatSchema = createInsertSchema(chatHistory).omit({ 
  id: true, 
  timestamp: true 
});

export const insertMetricsSchema = createInsertSchema(trainingMetrics).omit({
  id: true,
  timestamp: true,
});

export type TrainingFile = typeof trainingFiles.$inferSelect;
export type InsertTrainingFile = z.infer<typeof insertTrainingFileSchema>;

export type Model = typeof models.$inferSelect;
export type InsertModel = z.infer<typeof insertModelSchema>;

export type ChatMessage = typeof chatHistory.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatSchema>;

export type TrainingMetric = typeof trainingMetrics.$inferSelect;
export type InsertTrainingMetric = z.infer<typeof insertMetricsSchema>;

export type TrainingStatus = {
  active: boolean;
  modelId: number;
  status: string;
  currentEpoch: number;
  totalEpochs: number;
  loss: number;
  fileIds: number[];
};
