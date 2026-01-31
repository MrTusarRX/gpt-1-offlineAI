import { 
  trainingFiles, models, chatHistory, trainingMetrics,
  type TrainingFile, type InsertTrainingFile,
  type Model, type InsertModel,
  type ChatMessage, type InsertChatMessage,
  type TrainingMetric, type InsertTrainingMetric
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createFile(file: InsertTrainingFile): Promise<TrainingFile>;
  getFiles(): Promise<TrainingFile[]>;
  getFile(id: number): Promise<TrainingFile | undefined>;
  deleteFile(id: number): Promise<void>;

  createModel(model: InsertModel): Promise<Model>;
  getModel(id: number): Promise<Model | undefined>;
  getLatestModel(): Promise<Model | undefined>;
  getReadyModel(): Promise<Model | undefined>;
  updateModelStatus(id: number, updates: Partial<Model>): Promise<Model>;
  saveModelWeights(id: number, weights: string, tokenizer: string): Promise<void>;

  addTrainingMetric(metric: InsertTrainingMetric): Promise<TrainingMetric>;
  getTrainingMetrics(modelId: number): Promise<TrainingMetric[]>;

  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(): Promise<ChatMessage[]>;
  clearChatHistory(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createFile(file: InsertTrainingFile): Promise<TrainingFile> {
    const [created] = await db.insert(trainingFiles).values(file).returning();
    return created;
  }

  async getFiles(): Promise<TrainingFile[]> {
    return db.select().from(trainingFiles).orderBy(desc(trainingFiles.uploadedAt));
  }

  async getFile(id: number): Promise<TrainingFile | undefined> {
    const [file] = await db.select().from(trainingFiles).where(eq(trainingFiles.id, id));
    return file;
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(trainingFiles).where(eq(trainingFiles.id, id));
  }

  async createModel(model: InsertModel): Promise<Model> {
    const [created] = await db.insert(models).values({
      ...model,
      status: "training",
      currentEpoch: 0,
      totalEpochs: 10,
    }).returning();
    return created;
  }

  async getModel(id: number): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.id, id));
    return model;
  }

  async getLatestModel(): Promise<Model | undefined> {
    const [model] = await db.select().from(models).orderBy(desc(models.id)).limit(1);
    return model;
  }

  async getReadyModel(): Promise<Model | undefined> {
    const [model] = await db.select().from(models)
      .where(eq(models.status, "ready"))
      .orderBy(desc(models.id))
      .limit(1);
    return model;
  }

  async updateModelStatus(id: number, updates: Partial<Model>): Promise<Model> {
    const [updated] = await db.update(models)
      .set(updates)
      .where(eq(models.id, id))
      .returning();
    return updated;
  }

  async saveModelWeights(id: number, weights: string, tokenizer: string): Promise<void> {
    await db.update(models)
      .set({ modelWeights: weights, tokenizerData: tokenizer })
      .where(eq(models.id, id));
  }

  async addTrainingMetric(metric: InsertTrainingMetric): Promise<TrainingMetric> {
    const [created] = await db.insert(trainingMetrics).values(metric).returning();
    return created;
  }

  async getTrainingMetrics(modelId: number): Promise<TrainingMetric[]> {
    return db.select().from(trainingMetrics)
      .where(eq(trainingMetrics.modelId, modelId))
      .orderBy(trainingMetrics.epoch);
  }

  async addChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatHistory).values(message).returning();
    return created;
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return db.select().from(chatHistory).orderBy(chatHistory.timestamp);
  }

  async clearChatHistory(): Promise<void> {
    await db.delete(chatHistory);
  }
}

export const storage = new DatabaseStorage();
