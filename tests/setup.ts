import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Test default: keep endpoint resolution predictable unless a test overrides it.
if (!process.env.NEXT_PUBLIC_DEPLOYMENT_MODE) {
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'staging';
}

// Solr core overrides keep tests deterministic regardless of external env files.
if (!process.env.NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION) {
  process.env.NEXT_PUBLIC_SOLR_REACTIONS_COLLECTION = 'reactions_staging';
}
if (!process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION) {
  process.env.NEXT_PUBLIC_SOLR_COMPOUNDS_COLLECTION = 'compounds_staging';
}

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Polyfill for generic mocks
// global.fetch = vi.fn();
