import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Document chunking strategies
export function chunkDocument(content: string, strategy: 'semantic' | 'fixed' | 'recursive', chunkSize = 1000) {
  switch (strategy) {
    case 'fixed':
      return fixedChunking(content, chunkSize);
    case 'recursive':
      return recursiveChunking(content, chunkSize);
    case 'semantic':
    default:
      return semanticChunking(content);
  }
}

function fixedChunking(content: string, size: number) {
  const chunks = [];
  for (let i = 0; i < content.length; i += size) {
    chunks.push(content.slice(i, i + size));
  }
  return chunks;
}

function recursiveChunking(content: string, size: number) {
  const separators = ['\n\n', '\n', '. ', ' '];
  return chunkWithSeparators(content, size, separators);
}

function chunkWithSeparators(content: string, size: number, separators: string[]): string[] {
  if (content.length <= size) return [content];

  const sep = separators[0] || '';
  const parts = content.split(sep);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    if ((current + sep + part).length > size && current) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? current + sep + part : part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function semanticChunking(content: string) {
  const paragraphs = content.split('\n\n');
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > 1000 && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Generate embeddings
async function generateEmbedding(text: string) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

// Store chunks with embeddings
export async function storeChunks(chunks: string[], metadata: any = {}) {
  const stored = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    const { data, error } = await supabase
      .from('rag_documents')
      .insert({ content: chunk, embedding, metadata })
      .select()
      .single();
    if (!error) stored.push(data);
  }
  return stored;
}

// Hybrid search (semantic + keyword)
export async function hybridSearch(query: string, limit = 5) {
  const embedding = await generateEmbedding(query);

  const { data: semanticResults } = await supabase.rpc('match_rag_documents', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: limit,
  });

  const { data: keywordResults } = await supabase
    .from('rag_documents')
    .select('*')
    .textSearch('content', query)
    .limit(limit);

  // Merge and deduplicate
  const allResults = [...(semanticResults || []), ...(keywordResults || [])];
  const unique = Array.from(new Map(allResults.map(r => [r.id, r])).values());
  return unique.slice(0, limit);
}

// RAG query with reranking
export async function ragQuery(question: string) {
  const docs = await hybridSearch(question, 3);
  const context = docs.map((d: any) => d.content).join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: `Answer based on this context:\n${context}` },
      { role: 'user', content: question },
    ],
  });

  return {
    answer: response.choices[0].message.content,
    sources: docs.map((d: any) => ({ id: d.id, content: d.content.substring(0, 100) })),
  };
}