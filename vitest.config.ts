// vitest.config.ts
// Sprint Agents IA v20 · 30 avril 2026
//
// Configuration Vitest pour les tests unitaires AMANA.
// Couvre la logique d'aiguillage et les validations.

import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'lib/onboarding/**',
        'lib/documents/generate-pdf.ts',
        'lib/workflow/workflow-service.ts',
      ],
      thresholds: {
        // Seuils minimums pour considérer la logique critique testée
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
