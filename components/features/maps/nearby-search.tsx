'use client'

import { useGetApiMapsNearby, useGetApiMapsPlaceTypes } from '@/lib/api/generated-openAPI'
import { useState } from 'react'

export function NearbyPlacesSearch() {
  const [lat, setLat] = useState('10.7559730')
  const [lng, setLng] = useState('106.6823400')
  const [radius, setRadius] = useState('1000')
  const [type, setType] = useState('hospital|pharmacy')

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLat(position.coords.latitude.toString())
        setLng(position.coords.longitude.toString())
      })
    }
  }

  // Fetch place types
  const { data: placeTypes } = useGetApiMapsPlaceTypes()

  // Search nearby places
  const { data, isLoading, error } = useGetApiMapsNearby({
    query: {
      latitude: lat,
      longitude: lng,
      radius,
      type,
    },
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Latitude</label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label>Longitude</label>
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
      </div>

      <div>
        <label>Radius (meters)</label>
        <input
          type="number"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label>Place Type</label>
        <input
          type="text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="e.g., hospital|pharmacy|restaurant"
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <button
        onClick={getCurrentLocation}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        Use My Location
      </button>

      {isLoading && <div>Searching...</div>}

      {error && <div className="text-red-500">Error: {error.message}</div>}

      {data && (
        <div>
          <h3 className="font-bold mb-2">Found {data.total} places</h3>
          <div className="space-y-2">
            {data.results.map((place) => (
              <div key={place.place_id} className="border rounded p-3">
                <h4 className="font-semibold">{place.name}</h4>
                <p className="text-sm text-gray-600">{place.formatted_address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {place.geometry.location.lat}, {place.geometry.location.lng}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available place types */}
      {placeTypes && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Available Place Types</summary>
          <div className="mt-2 space-y-2">
            {placeTypes.categories.map((category) => (
              <div key={category.name} className="border-l-2 border-gray-300 pl-3">
                <h5 className="font-medium">{category.name}</h5>
                <p className="text-sm text-gray-600">{category.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Types: {category.types.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
