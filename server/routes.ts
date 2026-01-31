import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import * as tf from "@tensorflow/tfjs-node";

let isTraining = false;
let currentTrainingModelId: number | null = null;
let trainingStatus = {
  active: false,
  modelId: 0,
  status: "idle",
  currentEpoch: 0,
  totalEpochs: 0,
  loss: 0,
  fileIds: [] as number[],
};

let activeModel: tf.LayersModel | null = null;
let activeTokenizer: { 
  charToIndex: Record<string, number>, 
  indexToChar: Record<number, string>, 
  vocabSize: number 
} | null = null;

const SEQ_LENGTH = 30;
const EMBEDDING_DIM = 64;
const LSTM_UNITS = 128;
const FFN_UNITS = 256;
const DROPOUT_RATE = 0.2;

function createTokenizer(text: string) {
  const chars = Array.from(new Set(text.split(''))).sort();
  const charToIndex: Record<string, number> = {};
  const indexToChar: Record<number, string> = {};
  chars.forEach((c, i) => {
    charToIndex[c] = i;
    indexToChar[i] = c;
  });
  return { charToIndex, indexToChar, vocabSize: chars.length };
}

function encodeText(text: string, charToIndex: Record<string, number>): number[] {
  return text.split('').map(c => charToIndex[c] ?? 0);
}

class AttentionLayer extends tf.layers.Layer {
  static className = 'AttentionLayer';
  
  constructor(config?: any) {
    super(config || {});
  }

  build(inputShape: tf.Shape | tf.Shape[]) {
    super.build(inputShape);
  }

  computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape {
    const shape = inputShape as tf.Shape;
    return [shape[0], shape[2]];
  }

  call(inputs: tf.Tensor | tf.Tensor[], kwargs?: any): tf.Tensor {
    return tf.tidy(() => {
      const input = Array.isArray(inputs) ? inputs[0] : inputs;
      
      const scores = tf.sum(input, -1);
      const weights = tf.softmax(scores, -1);
      const weightsExpanded = tf.expandDims(weights, -1);
      const weighted = tf.mul(input, weightsExpanded);
      const output = tf.sum(weighted, 1);
      
      return output as tf.Tensor;
    });
  }

  getClassName() {
    return 'AttentionLayer';
  }
}

tf.serialization.registerClass(AttentionLayer);

function buildEnhancedModel(vocabSize: number): tf.LayersModel {
  const input = tf.input({ shape: [SEQ_LENGTH] });
  
  const embedding = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: EMBEDDING_DIM,
    inputLength: SEQ_LENGTH,
  }).apply(input) as tf.SymbolicTensor;

  const lstm1 = tf.layers.lstm({
    units: LSTM_UNITS,
    returnSequences: true,
    dropout: DROPOUT_RATE,
  }).apply(embedding) as tf.SymbolicTensor;

  const lstm2 = tf.layers.lstm({
    units: LSTM_UNITS,
    returnSequences: true,
    dropout: DROPOUT_RATE,
  }).apply(lstm1) as tf.SymbolicTensor;

  const attention = new AttentionLayer().apply(lstm2) as tf.SymbolicTensor;

  const ffn1 = tf.layers.dense({ 
    units: FFN_UNITS, 
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }).apply(attention) as tf.SymbolicTensor;
  
  const dropout1 = tf.layers.dropout({ rate: DROPOUT_RATE }).apply(ffn1) as tf.SymbolicTensor;
  
  const ffn2 = tf.layers.dense({ 
    units: FFN_UNITS / 2, 
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }).apply(dropout1) as tf.SymbolicTensor;
  
  const dropout2 = tf.layers.dropout({ rate: DROPOUT_RATE }).apply(ffn2) as tf.SymbolicTensor;

  const output = tf.layers.dense({ 
    units: vocabSize, 
    activation: 'softmax',
  }).apply(dropout2) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: output });
  
  model.compile({
    loss: 'sparseCategoricalCrossentropy',
    optimizer: tf.train.adam(0.001),
    metrics: ['accuracy'],
  });

  return model;
}

async function serializeWeights(model: tf.LayersModel): Promise<string> {
  const weights = model.getWeights();
  const serialized = weights.map(w => ({
    data: Array.from(w.dataSync()),
    shape: w.shape,
  }));
  return JSON.stringify(serialized);
}

async function loadWeightsFromData(model: tf.LayersModel, weightsJson: string): Promise<void> {
  const parsed = JSON.parse(weightsJson);
  const tensors = parsed.map((w: { data: number[], shape: number[] }) => 
    tf.tensor(w.data, w.shape)
  );
  model.setWeights(tensors);
  tensors.forEach((t: tf.Tensor) => t.dispose());
}

async function loadModelFromDatabase(): Promise<boolean> {
  try {
    const savedModel = await storage.getReadyModel();
    if (!savedModel || !savedModel.modelWeights || !savedModel.tokenizerData) {
      console.log("No saved model found in database");
      return false;
    }

    activeTokenizer = JSON.parse(savedModel.tokenizerData);
    if (!activeTokenizer) return false;

    activeModel = buildEnhancedModel(activeTokenizer.vocabSize);
    await loadWeightsFromData(activeModel, savedModel.modelWeights);
    
    console.log(`Loaded model ${savedModel.id} from database`);
    return true;
  } catch (err) {
    console.error("Failed to load model from database:", err);
    return false;
  }
}

function calculateOptimalEpochs(textLength: number): number {
  if (textLength < 5000) return 0;
  if (textLength < 20000) return 100;
  if (textLength < 100000) return 60;
  if (textLength < 500000) return 50;
  if (textLength < 1000000) return 30;
  return 25;
}

async function startTraining(modelId: number, fileIds: number[], epochs?: number) {
  if (isTraining) return;
  isTraining = true;
  currentTrainingModelId = modelId;

  try {
    let fullText = "";
    for (const id of fileIds) {
      const file = await storage.getFile(id);
      if (file) fullText += file.content + "\n";
    }

    if (!fullText.trim()) throw new Error("No content to train on");

    console.log(`Training on ${fullText.length} characters of text`);

    const autoEpochs = epochs || calculateOptimalEpochs(fullText.length);
    
    if (autoEpochs === 0) {
      throw new Error(`Text is too small to train (${fullText.length} characters). Minimum 5KB required for effective training.`);
    }
    
    console.log(`Using ${autoEpochs} epochs for ${fullText.length} characters`);

    const tokenizer = createTokenizer(fullText);
    activeTokenizer = tokenizer;
    console.log(`Vocabulary size: ${tokenizer.vocabSize} unique characters`);

    const indices = encodeText(fullText, tokenizer.charToIndex);
    
    const step = fullText.length > 100000 ? 8 : 6;
    const sequences: number[][] = [];
    const nextChars: number[] = [];
    
    for (let i = 0; i < indices.length - SEQ_LENGTH; i += step) {
      sequences.push(indices.slice(i, i + SEQ_LENGTH));
      nextChars.push(indices[i + SEQ_LENGTH]);
    }

    if (sequences.length === 0) {
      throw new Error("Not enough data to create training sequences");
    }

    console.log(`Created ${sequences.length} training sequences`);

    const model = buildEnhancedModel(tokenizer.vocabSize);
    console.log("Model architecture:");
    model.summary();

    const xsTensor = tf.tensor2d(sequences, [sequences.length, SEQ_LENGTH]);
    const ysTensor = tf.tensor1d(nextChars, 'float32');

    trainingStatus = {
      active: true,
      modelId,
      status: "training",
      currentEpoch: 0,
      totalEpochs: autoEpochs,
      loss: 0,
      fileIds: fileIds,
    };

    await model.fit(xsTensor, ysTensor, {
      epochs: autoEpochs,
      batchSize: fullText.length > 100000 ? 256 : 128,
      validationSplit: 0.05,
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const loss = logs?.loss || 0;
          const acc = logs?.acc || 0;
          
          trainingStatus.currentEpoch = epoch + 1;
          trainingStatus.loss = loss;
          
          await storage.updateModelStatus(modelId, {
            currentEpoch: epoch + 1,
            lastLoss: loss,
            accuracy: acc,
          });

          await storage.addTrainingMetric({
            modelId,
            epoch: epoch + 1,
            loss,
            accuracy: acc,
          });
          
          console.log(`Epoch ${epoch + 1}/${epochs}: loss=${loss.toFixed(4)}, acc=${(acc * 100).toFixed(2)}%`);
        }
      }
    });

    activeModel = model;

    const weightsJson = await serializeWeights(model);
    const tokenizerJson = JSON.stringify(tokenizer);
    await storage.saveModelWeights(modelId, weightsJson, tokenizerJson);
    
    await storage.updateModelStatus(modelId, {
      status: "ready",
      lastLoss: trainingStatus.loss,
    });

    console.log(`Training complete! Model ${modelId} saved to database.`);

    xsTensor.dispose();
    ysTensor.dispose();

  } catch (err) {
    console.error("Training error:", err);
    await storage.updateModelStatus(modelId, { status: "failed" });
    trainingStatus.status = "failed";
  } finally {
    isTraining = false;
    currentTrainingModelId = null;
    trainingStatus.active = false;
    trainingStatus.fileIds = [];
  }
}

function generateText(seed: string, length: number = 100, temperature: number = 0.7): string {
  if (!activeModel || !activeTokenizer) return "Model not ready. Please train first.";
  
  let generated = "";
  let inputSeq = seed.slice(-SEQ_LENGTH).padStart(SEQ_LENGTH, ' ');
  
  for (let i = 0; i < length; i++) {
    const encoded = encodeText(inputSeq, activeTokenizer.charToIndex);
    const inputTensor = tf.tensor2d([encoded], [1, SEQ_LENGTH]);
    
    const preds = activeModel.predict(inputTensor) as tf.Tensor;
    const predsData = preds.dataSync() as Float32Array;
    
    inputTensor.dispose();
    preds.dispose();

    const nextIndex = sampleWithTemperature(predsData, temperature);
    const nextChar = activeTokenizer.indexToChar[nextIndex] || ' ';
    
    generated += nextChar;
    inputSeq = inputSeq.slice(1) + nextChar;
  }
  
  return generated;
}

function sampleWithTemperature(preds: Float32Array, temperature: number): number {
  const logits = Array.from(preds).map(p => Math.log(Math.max(p, 1e-10)) / temperature);
  const maxLogit = Math.max(...logits);
  const expLogits = logits.map(l => Math.exp(l - maxLogit));
  const sum = expLogits.reduce((a, b) => a + b, 0);
  const probs = expLogits.map(e => e / sum);
  
  let r = Math.random();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await loadModelFromDatabase();

  app.post(api.files.upload.path, async (req, res) => {
    try {
      const input = api.files.upload.input.parse(req.body);
      const file = await storage.createFile({ 
        filename: input.filename, 
        content: input.content 
      });
      res.status(201).json({ id: file.id, filename: file.filename });
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.files.list.path, async (req, res) => {
    const files = await storage.getFiles();
    res.json(files.map(f => ({
      id: f.id,
      filename: f.filename,
      uploadedAt: f.uploadedAt.toISOString()
    })));
  });

  app.delete(api.files.delete.path, async (req, res) => {
    await storage.deleteFile(Number(req.params.id));
    res.status(204).end();
  });

  app.post(api.models.train.path, async (req, res) => {
    const input = api.models.train.input.parse(req.body);
    
    if (isTraining) {
      return res.status(400).json({ message: "Training already in progress" });
    }

    const model = await storage.createModel(input);
    
    const epochs = 10;
    startTraining(model.id, input.fileIds, epochs);

    res.status(202).json({ message: "Training started", modelId: model.id });
  });

  app.get(api.models.status.path, (req, res) => {
    res.json(trainingStatus);
  });

  app.post(api.chat.send.path, async (req, res) => {
    const { message, temperature } = api.chat.send.input.parse(req.body);

    await storage.addChatMessage({ role: "user", content: message });

    if (!activeModel || !activeTokenizer) {
       const mockReply = "I haven't been trained yet! Please upload text files and start training first.";
       await storage.addChatMessage({ role: "assistant", content: mockReply });
       return res.json({ reply: mockReply });
    }

    const reply = generateText(message, 150, temperature);
    await storage.addChatMessage({ role: "assistant", content: reply });
    
    res.json({ reply });
  });

  app.get(api.chat.history.path, async (req, res) => {
    const history = await storage.getChatHistory();
    res.json(history.map(h => ({
      role: h.role,
      content: h.content,
      timestamp: h.timestamp.toISOString()
    })));
  });
  
  app.delete(api.chat.clear.path, async (req, res) => {
    await storage.clearChatHistory();
    res.status(204).end();
  });

  return httpServer;
}
