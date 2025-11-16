/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format time to HH:mm
 */
export function formatTime(time?: string): string {
  if (!time) return 'N/A'
  return time
}

/**
 * Format rating to 1 decimal place
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

/**
 * Format distance in meters to km or m
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${meters.toFixed(0)} m`
}
