// Environment variables configuration
// This file helps with type-safe environment variables

const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
] as const

const optionalEnvVars = [
  'NEXT_PUBLIC_MAP_API_KEY',
] as const

// Validate required environment variables
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
})

export const env = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL!,
  mapApiKey: process.env.NEXT_PUBLIC_MAP_API_KEY,
  
  // App Configuration
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

export type Env = typeof env
