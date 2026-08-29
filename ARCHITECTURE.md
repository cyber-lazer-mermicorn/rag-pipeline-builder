# Architecture

## Overview
Modular RAG pipeline with typed stages: ingest → chunk → embed → store → retrieve → rerank → generate → evaluate.

## Pipeline stages

| Stage | Path | Tool |
|---|---|---|
| Ingest | `lib/pipeline/ingest.ts` | File loaders, URL loaders |
| Chunk | `lib/pipeline/chunk.ts` | `RecursiveCharacterTextSplitter` |
| Embed | `lib/pipeline/embed.ts` | OpenAI batch embeddings |
| Store | `lib/pipeline/store.ts` | Supabase pgvector upsert |
| Retrieve | `lib/pipeline/retrieve.ts` | pgvector similarity search |
| Rerank | `lib/pipeline/rerank.ts` | Cohere rerank API |
| Generate | `lib/pipeline/generate.ts` | OpenAI structured output + citations |
| Evaluate | `lib/pipeline/eval.ts` | Faithfulness / relevance scoring |

## Evaluation
Eval runs produce JSON in `evals/YYYY-MM-DD-HH.json` with per-query scores. Used to tune chunk size, K, and reranking threshold.
