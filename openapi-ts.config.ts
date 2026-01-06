import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  client: 'fetch', // Use built-in fetch client
  input: process.env.NEXT_PUBLIC_API_URL + '/doc', // Backend OpenAPI endpoint
  output: {
    path: './lib/api/generated-openAPI',
    format: 'prettier',
    lint: 'eslint',
  },
  types: {
    enums: 'javascript',
  },
  services: {
    asClass: false,
  },
  plugins: [
    '@tanstack/react-query', // Generate React Query hooks
  ],
})
