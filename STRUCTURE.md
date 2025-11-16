# Next.js App Router - Best Practices Structure

## 📁 Recommended Project Structure

```
fe-itss/
├── app/                          # App Router (Next.js 13+)
│   ├── (auth)/                  # Route groups - Auth pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx           # Auth layout
│   │
│   ├── (main)/                  # Route groups - Main app pages
│   │   ├── places/
│   │   │   ├── page.tsx         # /places - List
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx     # /places/[id] - Detail
│   │   │   └── loading.tsx      # Loading state
│   │   ├── favorites/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── layout.tsx           # Main app layout
│   │
│   ├── admin/                   # Admin pages (protected)
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── places/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/                     # API Routes (if needed)
│   │   └── auth/
│   │       └── route.ts
│   │
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (/)
│   ├── loading.tsx              # Global loading
│   ├── error.tsx                # Global error
│   ├── not-found.tsx            # 404 page
│   └── globals.css
│
├── components/                   # React Components
│   ├── ui/                      # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── features/                # Feature-specific components
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   └── register-form.tsx
│   │   ├── places/
│   │   │   ├── place-card.tsx
│   │   │   ├── place-list.tsx
│   │   │   ├── place-filter.tsx
│   │   │   └── place-map.tsx
│   │   ├── reviews/
│   │   │   ├── review-form.tsx
│   │   │   └── review-list.tsx
│   │   └── favorites/
│   │       └── favorite-button.tsx
│   │
│   ├── layout/                  # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   └── navbar.tsx
│   │
│   └── providers/               # Context providers
│       ├── auth-provider.tsx
│       ├── theme-provider.tsx
│       └── query-provider.tsx
│
├── lib/                         # Utility functions & configurations
│   ├── api/                     # API client & endpoints
│   │   ├── client.ts            # Axios/Fetch wrapper
│   │   ├── auth.ts              # Auth API calls
│   │   ├── places.ts            # Places API calls
│   │   └── reviews.ts           # Reviews API calls
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-places.ts
│   │   ├── use-reviews.ts
│   │   └── use-local-storage.ts
│   │
│   ├── utils/                   # Helper functions
│   │   ├── cn.ts                # className utility
│   │   ├── format.ts            # Formatting helpers
│   │   ├── validation.ts        # Validation helpers
│   │   └── constants.ts         # App constants
│   │
│   ├── stores/                  # State management (Zustand/Redux)
│   │   ├── auth-store.ts
│   │   └── ui-store.ts
│   │
│   └── validations/             # Zod schemas
│       ├── auth.ts
│       ├── place.ts
│       └── review.ts
│
├── types/                       # TypeScript type definitions
│   ├── index.ts
│   ├── auth.ts
│   ├── place.ts
│   ├── review.ts
│   └── api.ts
│
├── config/                      # App configuration
│   ├── site.ts                  # Site metadata
│   └── env.ts                   # Environment variables
│
├── styles/                      # Additional styles (if needed)
│   └── custom.css
│
├── public/                      # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── .env.local                   # Environment variables
├── .env.example                 # Example env file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🎯 Key Best Practices

### 1. **Route Groups** `(folder)`
- Use for organizing routes without affecting URL
- Example: `(auth)`, `(main)`, `(admin)`
- Shared layouts per group

### 2. **Colocation**
- Keep related files close together
- Use `_components` folder for page-specific components
- Example: `app/(main)/places/_components/place-filter.tsx`

### 3. **Server vs Client Components**
- **Server Components (default)**: Data fetching, no interactivity
- **Client Components (`'use client'`)**: State, effects, event handlers
- Keep client components small and deep in tree

### 4. **Data Fetching Patterns**
```typescript
// Server Component (recommended)
async function PlacesPage() {
  const places = await getPlaces() // Direct API call
  return <PlaceList places={places} />
}

// Client Component (when needed)
'use client'
function PlacesPage() {
  const { data, isLoading } = usePlaces() // React Query
  return <PlaceList places={data} />
}
```

### 5. **Loading & Error States**
- Use `loading.tsx` for automatic loading UI
- Use `error.tsx` for error boundaries
- Use Suspense for granular loading

### 6. **API Integration**
```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// lib/api/places.ts
export const getPlaces = async (params) => {
  const { data } = await apiClient.get('/places', { params })
  return data
}
```

### 7. **Type Safety**
```typescript
// types/place.ts
export interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
  // ...
}

// Use Zod for runtime validation
import { z } from 'zod'
export const PlaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  // ...
})
```

### 8. **Styling Approach**
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Copy-paste component library
- **CSS Modules**: For complex components (optional)

### 9. **State Management**
- **Server State**: React Query / SWR
- **Client State**: Zustand / Context API
- **URL State**: searchParams, useRouter

### 10. **File Naming Conventions**
- **Pages**: `page.tsx`
- **Layouts**: `layout.tsx`
- **Components**: `kebab-case.tsx` or `PascalCase.tsx`
- **Utilities**: `kebab-case.ts`
- **Types**: `kebab-case.ts`

## 📦 Recommended Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    // UI & Styling
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    
    // Data Fetching & State
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    
    // Forms & Validation
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    
    // Maps (for your project)
    "mapbox-gl": "^3.0.0",
    "react-map-gl": "^7.1.0",
    
    // Utilities
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.3.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

## 🚀 Performance Tips

1. **Image Optimization**: Use `next/image`
2. **Font Optimization**: Use `next/font`
3. **Dynamic Imports**: `next/dynamic` for code splitting
4. **Metadata**: Use `generateMetadata` for SEO
5. **Streaming**: Use Suspense boundaries
6. **Caching**: Leverage Next.js caching strategies

## 🔐 Security

1. **Environment Variables**: Use `NEXT_PUBLIC_` prefix for client-side
2. **API Keys**: Never expose in client code
3. **Authentication**: JWT in httpOnly cookies
4. **CORS**: Configure properly for API calls

## 📝 Examples

### Protected Route
```typescript
// app/(main)/favorites/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function FavoritesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  return <div>Favorites</div>
}
```

### API Integration with React Query
```typescript
// lib/hooks/use-places.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlaces } from '@/lib/api/places'

export function usePlaces(filters) {
  return useQuery({
    queryKey: ['places', filters],
    queryFn: () => getPlaces(filters),
  })
}
```

This structure provides scalability, maintainability, and follows Next.js 15 best practices! 🎉
