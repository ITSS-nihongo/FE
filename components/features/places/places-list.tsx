// 'use client'

// import { useGetApiPlaces } from '@/lib/api/generated-openAPI'
// import { useState } from 'react'

// export function PlacesList() {
//   const [search, setSearch] = useState('')
//   const [placeType, setPlaceType] = useState<'INDOOR' | 'OUTDOOR' | undefined>()

//   // Auto-generated React Query hook with automatic caching & refetching
//   const { data, isLoading, error, refetch } = useGetApiPlaces({
//     query: {
//       search,
//       placeType,
//       limit: '20',
//       offset: '0',
//     },
//   })

//   if (isLoading) {
//     return <div>Loading places...</div>
//   }

//   if (error) {
//     return <div>Error: {error.message}</div>
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex gap-4">
//         <input
//           type="text"
//           placeholder="Search places..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="border rounded px-3 py-2"
//         />

//         <select
//           value={placeType || ''}
//           onChange={(e) => setPlaceType(e.target.value as any)}
//           className="border rounded px-3 py-2"
//         >
//           <option value="">All Types</option>
//           <option value="INDOOR">Indoor</option>
//           <option value="OUTDOOR">Outdoor</option>
//         </select>

//         <button onClick={() => refetch()} className="px-4 py-2 bg-blue-500 text-white rounded">
//           Refresh
//         </button>
//       </div>

//       <div className="text-sm text-gray-600">
//         Total: {data?.total} places
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {data?.places.map((place) => (
//           <div key={place.id} className="border rounded p-4">
//             <h3 className="font-bold">{place.name}</h3>
//             <p className="text-sm text-gray-600">{place.address}</p>
//             <div className="mt-2 flex items-center gap-2">
//               <span className="text-yellow-500">★</span>
//               <span>{place.averageRating.toFixed(1)}</span>
//               <span className="text-gray-500">({place.totalReviews})</span>
//             </div>
//             <div className="mt-2">
//               <span className={`px-2 py-1 text-xs rounded ${
//                 place.placeType === 'INDOOR' ? 'bg-blue-100' : 'bg-green-100'
//               }`}>
//                 {place.placeType}
//               </span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }
