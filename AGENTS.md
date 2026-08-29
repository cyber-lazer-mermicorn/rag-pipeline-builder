# RAG Pipeline Builder — Agent Doctrine

## What this repo is
Production-grade Retrieval-Augmented Generation pipeline: ingestion, chunking, embedding, retrieval, reranking, and generation.
By Cherry Shanaley (Chan), AI Solutions Engineer.

## Tech stack
- **Framework:** Next.js 15 + TypeScript strict
- **Embeddings:** OpenAI `text-embedding-3-small` (default) or `text-embedding-3-large`
- **Vector Store:** Supabase pgvector
- **Reranking:** Cohere rerank API
- **LLM:** OpenAI GPT-4o via structured outputs
- **Deployment:** Vercel

## Coding rules
- Pipeline stages are composable functions in `lib/pipeline/` — each takes typed input and returns typed output
- Chunking: always `RecursiveCharacterTextSplitter` with `chunkSize: 512`, `chunkOverlap: 64` defaults
- Embeddings: always batch — never embed one-at-a-time in a loop
- Retrieval: top-K is configurable, default 10; reranking reduces to top-3
- Generation: use structured output for final answer + source citations
- Evaluation metrics stored in `evals/` as JSON — faithfulness, relevance, groundedness

## Commands
```bash
npm install && npm run dev
npm run ingest -- --source ./docs
npm run eval
npm run test
```

## Do not
- Embed documents one-by-one — always batch
- Skip reranking for production retrieval
- Hardcode chunk sizes outside `lib/pipeline/config.ts`
- Skip evaluation metrics
