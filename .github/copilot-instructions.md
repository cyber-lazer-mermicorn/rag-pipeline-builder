# GitHub Copilot Instructions — RAG Pipeline Builder

## Always
- Use composable typed stage functions from `lib/pipeline/`
- Batch embedding calls — never single-doc embed loops
- Apply Cohere reranking after initial vector retrieval
- Use structured outputs for generation with source citations
- Store eval results as JSON in `evals/`

## Never
- Embed documents one at a time
- Hardcode `chunkSize` outside config
- Skip reranking in production path
- Return generation without source attribution

## Pattern: pipeline stage
```typescript
export async function retrieveDocuments(query: string, k: number = 10): Promise<Document[]> {
  const embedding = await embedQuery(query); // batched internally
  return vectorStore.similaritySearch(embedding, k);
}
```
