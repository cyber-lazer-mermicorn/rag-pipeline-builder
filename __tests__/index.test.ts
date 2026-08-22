import { describe, expect, it } from 'vitest';

import { storeChunks } from '../lib/rag';

describe('storeChunks', () => {
  it('should be defined', () => {
    expect(storeChunks).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof storeChunks).toBe('function');
  });
});
