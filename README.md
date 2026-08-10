# RAG Pipeline Builder
## Solves: "How do I build production RAG?"

The #1 bottleneck for LlamaIndex: **RAG is complex**. This makes it simple.

**Live:** https://rag-pipeline-builder.vercel.app

---

## The Problem

Developers want RAG but struggle with:
- Document chunking
- Embedding selection
- Vector store setup
- Query optimization

## The Solution

Visual RAG builder. Point, click, deploy. No PhD required.

---

## What's Included

### 1. Document Processor
```typescript
// Automatic document chunking
const chunks = await processDocument({
  file: document,
  strategy: 'semantic', // or 'fixed', 'recursive'
  chunkSize: 1000,
  overlap: 200,
});
```

### 2. Embedding Selector
```typescript
// Choose the right embeddings
const embedding = await selectEmbedding({
  useCase: 'code-search', // or 'docs', 'chat'
  provider: 'openai', // or 'cohere', 'voyage'
});
```

### 3. Vector Store Setup
```typescript
// One-click vector store
const store = await setupVectorStore({
  provider: 'supabase', // or 'pinecone', 'qdrant'
  dimensions: 1536,
  index: 'hnsw',
});
```

### 4. Query Optimizer
```typescript
// Optimize queries automatically
const optimized = await optimizeQuery({
  query: 'user question',
  strategy: 'hybrid', // or 'semantic', 'keyword'
  rerank: true,
});
```

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/cyber-lazer-mermicorn/rag-pipeline-builder.git

# Install dependencies
npm install

# Run
npm run dev
```

---

## Why This Matters for LlamaIndex

**The bottleneck:** RAG is complex. Developers give up or build poorly.

**The fix:** Visual builder makes RAG accessible to everyone.

**The result:** LlamaIndex becomes the easiest way to build RAG.

---

## Pipeline Options

| Component | Options | Recommended |
|-----------|---------|-------------|
| Chunking | Semantic, Fixed, Recursive | Semantic |
| Embeddings | OpenAI, Cohere, Voyage | OpenAI |
| Vector Store | Supabase, Pinecone, Qdrant | Supabase |
| Query | Hybrid, Semantic, Keyword | Hybrid |
| Reranking | Yes, No | Yes |

---

## Contact

**Cherry Shanaley (Chan)** — cyber.lazer.mermicorn@gmail.com

*Built this to solve RAG complexity*