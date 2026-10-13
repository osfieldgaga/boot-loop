import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/shared/tests/**/*.test.ts', 'packages/client/tests/**/*.test.ts'], environment: 'node', maxWorkers: 2 } });

