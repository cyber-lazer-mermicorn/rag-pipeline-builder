import OpenAI from 'openai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// This standalone showcase has no checked-in generated database contract yet.
let openai: OpenAI | undefined;
let supabase: SupabaseClient<any> | undefined;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

function getSupabaseClient() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }
    supabase = createClient<any>(url, serviceRoleKey);
  }
  return supabase;
}

// Chunking strategies
export function chunkText(text: string, strategy: 'fixed' | 'recursive' | 'semantic' = 'fixed', chunkSize = 500) {
  try {
    switch (strategy) {
      case 'fixed': return fixedChunking(text, chunkSize);
      case 'recursive': return recursiveChunking(text, chunkSize);
      case 'semantic': return semanticChunking(text, chunkSize);
      default: return fixedChunking(text, chunkSize);
    }
  } catch (error: any) {
    throw new Error(`Chunking error: ${error?.message || 'Unknown error'}`);
  }
}

function fixedChunking(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function recursiveChunking(text: string, size: number): string[] {
  const separators = ['\n\n', '\n', '. ', ' '];
  return recursiveSplit(text, size, separators);
}

function recursiveSplit(text: string, size: number, separators: string[]): string[] {
  if (text.length <= size) return [text];
  const sep = separators[0] || ' ';
  const parts = text.split(sep);
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

function semanticChunking(text: string, size: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > size && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Generate embeddings
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error: any) {
    throw new Error(`Embedding error: ${error?.message || 'Unknown error'}`);
  }
}

// Store chunks with embeddings
export async function storeChunks(chunks: string[], metadata?: Record<string, any>) {
  try {
    const results: any[] = [];
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      const { data, error } = await getSupabaseClient()
        .from('documents')
        .insert({ content: chunk, embedding, metadata })
        .select()
        .single();
      if (error) throw error;
      results.push(data);
    }
    return results;
  } catch (error: any) {
    throw new Error(`Store chunks error: ${error?.message || 'Unknown error'}`);
  }
}

// Hybrid search (vector + keyword)
export async function hybridSearch(query: string, limit = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data: vectorResults, error: vectorError } = await getSupabaseClient().rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: limit,
    });

    if (vectorError) throw vectorError;

    const { data: keywordResults, error: keywordError } = await getSupabaseClient()
      .from('documents')
      .select('*')
      .ilike('content', `%${query}%`)
      .limit(limit);

    if (keywordError) throw keywordError;

    const seen = new Set();
    const merged = [...(vectorResults || []), ...(keywordResults || [])].filter((item: any) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return merged.slice(0, limit);
  } catch (error: any) {
    throw new Error(`Hybrid search error: ${error?.message || 'Unknown error'}`);
  }
}

// RAG query with context
export async function ragQuery(question: string, contextLimit = 3) {
  try {
    const results = await hybridSearch(question, contextLimit);
    const context = results.map((r: any) => r.content).join('\n\n');

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: `Answer based on this context:\n${context}` },
        { role: 'user', content: question },
      ],
    });

    return {
      answer: response.choices[0].message.content,
      sources: results,
      context,
    };
  } catch (error: any) {
    throw new Error(`RAG query error: ${error?.message || 'Unknown error'}`);
  }
}

// Query expansion
export async function expandQuery(query: string): Promise<string[]> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Generate 3 alternative queries that would find similar information.' },
        { role: 'user', content: query },
      ],
    });

    const expanded = response.choices[0].message.content?.split('\n').filter(q => q.trim()) || [];
    return [query, ...expanded];
  } catch (error: any) {
    throw new Error(`Expand query error: ${error?.message || 'Unknown error'}`);
  }
}

// Context compression
export async function compressContext(context: string, maxLength = 500): Promise<string> {
  try {
    if (context.length <= maxLength) return context;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: `Compress this context to under ${maxLength} characters while keeping key information.` },
        { role: 'user', content: context },
      ],
    });

    return response.choices[0].message.content || context;
  } catch (error: any) {
    throw new Error(`Compress context error: ${error?.message || 'Unknown error'}`);
  }
}

// Reranker
export async function rerank(query: string, documents: string[], topK = 3) {
  try {
    const scored = await Promise.all(
      documents.map(async (doc) => {
        const response = await getOpenAIClient().chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'Rate relevance 0-10.' },
            { role: 'user', content: `Query: ${query}\nDocument: ${doc}` },
          ],
        });
        const score = parseInt(response.choices[0].message.content || '0') / 10;
        return { document: doc, score };
      })
    );

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (error: any) {
    throw new Error(`Rerank error: ${error?.message || 'Unknown error'}`);
  }
}

// Full pipeline
export async function fullRAGPipeline(documents: string[], question: string) {
  try {
    // Chunk documents
    const allChunks = documents.flatMap(doc => chunkText(doc, 'recursive'));

    // Store chunks
    await storeChunks(allChunks);

    // Expand query
    const expandedQueries = await expandQuery(question);

    // Search with expanded queries
    let allResults: any[] = [];
    for (const query of expandedQueries) {
      const results = await hybridSearch(query, 3);
      allResults.push(...results);
    }

    // Deduplicate
    const seen = new Set();
    allResults = allResults.filter((r: any) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Rerank
    const ranked = await rerank(question, allResults.map((r: any) => r.content), 3);

    // Compress context
    const context = await compressContext(ranked.map(r => r.document).join('\n\n'));

    // Generate answer
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: `Answer based on this context:\n${context}` },
        { role: 'user', content: question },
      ],
    });

    return {
      answer: response.choices[0].message.content,
      sources: ranked,
      chunksProcessed: allChunks.length,
      queriesExpanded: expandedQueries.length,
    };
  } catch (error: any) {
    throw new Error(`Full RAG pipeline error: ${error?.message || 'Unknown error'}`);
  }
}
