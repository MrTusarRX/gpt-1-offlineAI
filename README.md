# Offline AI Chatbot - Architecture Documentation

## Overview

A fully offline AI chatbot that trains on user-uploaded text files and generates human-like responses. The system uses a character-level LSTM neural network with attention mechanisms, running entirely locally without any cloud dependencies.

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | HTTP server and API routing |
| **TensorFlow.js (tfjs-node)** | Neural network training and inference |
| **PostgreSQL** | Persistent storage for files, models, and chat history |
| **Drizzle ORM** | Type-safe database queries |
| **Zod** | Request/response validation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Recharts** | Training loss visualization |
| **TanStack Query** | Data fetching and caching |
| **Wouter** | Client-side routing |

### Database Schema
```
┌─────────────────────┐
│   training_files    │
├─────────────────────┤
│ id (serial PK)      │
│ filename (text)     │
│ content (text)      │
│ uploaded_at (ts)    │
└─────────────────────┘

┌─────────────────────┐
│      models         │
├─────────────────────┤
│ id (serial PK)      │
│ name (text)         │
│ status (text)       │
│ config (text/JSON)  │
│ current_epoch (int) │
│ total_epochs (int)  │
│ last_loss (real)    │
│ accuracy (real)     │
│ created_at (ts)     │
└─────────────────────┘

┌─────────────────────┐
│    chat_history     │
├─────────────────────┤
│ id (serial PK)      │
│ role (text)         │
│ content (text)      │
│ timestamp (ts)      │
└─────────────────────┘
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  File Upload │  │   Training   │  │     Chat     │          │
│  │   (Dropzone) │  │  Dashboard   │  │  Interface   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    TanStack Query                               │
│                     (API Client)                                │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Routes                            │   │
│  │  POST /api/files          - Upload training file         │   │
│  │  GET  /api/files          - List all files               │   │
│  │  DELETE /api/files/:id    - Delete a file                │   │
│  │  POST /api/models/train   - Start training               │   │
│  │  GET  /api/models/status  - Get training status          │   │
│  │  POST /api/chat           - Send message, get reply      │   │
│  │  GET  /api/chat           - Get chat history             │   │
│  │  DELETE /api/chat         - Clear chat history           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────┼────────────────────────────────┐   │
│  │              TensorFlow.js Engine                        │   │
│  │                                                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  Tokenizer   │  │  LSTM Model  │  │  Inference   │   │   │
│  │  │  (char-lvl)  │  │  (128 units) │  │  (sampling)  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                                                          │   │
│  │  Training Loop:                                          │   │
│  │  Text → Tokenize → Embed → LSTM → Dense → Softmax       │   │
│  │  → CrossEntropy Loss → Backprop → Weight Update          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────┼────────────────────────────────┐   │
│  │                   Storage Layer                          │   │
│  │                   (Drizzle ORM)                          │   │
│  └────────────────────────┼────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │training_files│  │    models    │  │ chat_history │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Neural Network Architecture

```
Input: Character indices (40 chars)
       Shape: [batch_size, 40]
                    │
                    ▼
         ┌─────────────────────┐
         │  Embedding Layer    │
         │  (vocab → 64 dim)   │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   LSTM Layer 1      │
         │   (128 units)       │
         │   return_seq=True   │
         │   dropout=0.2       │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   LSTM Layer 2      │
         │   (128 units)       │
         │   return_seq=True   │
         │   dropout=0.2       │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Attention Layer    │
         │  (custom weighted   │
         │   sum pooling)      │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   FFN Layer 1       │
         │   (256 units, ReLU) │
         │   + Dropout 0.2     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   FFN Layer 2       │
         │   (128 units, ReLU) │
         │   + Dropout 0.2     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Output Dense       │
         │  (vocab_size)       │
         │  activation=softmax │
         └──────────┬──────────┘
                    │
                    ▼
Output: Probability distribution over next character
        Shape: [batch_size, vocab_size]

Loss: Sparse Categorical Cross-Entropy
Optimizer: Adam (lr=0.001)
```

### Architecture Features
- **Embedding Layer**: Converts character indices to dense vectors (64 dimensions)
- **Stacked LSTM**: Two LSTM layers for deeper sequence understanding
- **Custom Attention**: Weighted sum pooling to focus on important sequence positions
- **Feed-Forward Network (FFN)**: Two dense layers with ReLU activation
- **Dropout Regularization**: 20% dropout to prevent overfitting
- **Model Persistence**: Weights and tokenizer saved to PostgreSQL database

---

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Linux / WSL Setup

#### Step 1: Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### Step 2: Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE chatbot_db;
CREATE USER chatbot_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chatbot_db TO chatbot_user;
\q
```

**WSL (Windows Subsystem for Linux):**
```bash
# Same as Ubuntu, but start service differently
sudo service postgresql start

# Or install PostgreSQL on Windows and connect from WSL
# Set DATABASE_URL to point to Windows PostgreSQL
```

#### Step 3: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd offline-ai-chatbot

# Install dependencies
npm install
```

#### Step 4: Configure Environment

```bash
# Create .env file or set environment variable
export DATABASE_URL="postgresql://chatbot_user:your_password@localhost:5432/chatbot_db"

# On Replit, this is automatically configured
```

#### Step 5: Initialize Database

```bash
# Push schema to database
npm run db:push
```

#### Step 6: Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The application will be available at `http://localhost:5000`

---

## Usage Guide

### 1. Upload Training Data
- Navigate to the "Files" or "Training" tab
- Drag and drop `.txt` files into the upload zone
- Files are stored in PostgreSQL for persistence

### 2. Train the Model
- Select uploaded files for training
- Click "Start Training"
- Monitor progress via:
  - Epoch counter
  - Loss graph (should decrease over time)
  - Status indicator

### 3. Chat with the Model
- Navigate to "Chat" tab
- Type your message and press Enter
- Adjust "Temperature" slider for response randomness:
  - Low (0.2-0.5): More predictable, repetitive
  - Medium (0.6-0.8): Balanced creativity
  - High (0.9-1.0): More random, creative

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files` | POST | Upload a training file |
| `/api/files` | GET | List all uploaded files |
| `/api/files/:id` | DELETE | Delete a file |
| `/api/models/train` | POST | Start model training |
| `/api/models/status` | GET | Get current training status |
| `/api/chat` | POST | Send message, receive reply |
| `/api/chat` | GET | Get chat history |
| `/api/chat` | DELETE | Clear chat history |

---

## Troubleshooting

### Common Issues

**TensorFlow.js installation fails:**
```bash
# Install build tools
sudo apt install build-essential python3

# Rebuild native modules
npm rebuild @tensorflow/tfjs-node
```

**PostgreSQL connection refused:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U chatbot_user -d chatbot_db
```

**Model not generating responses:**
- Ensure you have trained the model on sufficient data (at least 10KB of text)
- Check that training completed successfully (status = "ready")
- Try lowering the temperature value

---

## Performance Notes

- Training on CPU is slow but works offline
- For better performance, ensure TensorFlow.js uses native bindings
- Recommended minimum training data: 50KB+ of text
- Training time: ~1-5 minutes for 10 epochs on moderate hardware

---

## License

MIT License - Feel free to use and modify.
