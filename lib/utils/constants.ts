export const PLACE_TYPES = {
  INDOOR: 'Trong nhà',
  OUTDOOR: 'Ngoài trời',
} as const

export const USER_ROLES = {
  USER: 'Người dùng',
  ADMIN: 'Quản trị viên',
} as const

export const AGE_RANGES = [
  { label: '0-3 tuổi', min: 0, max: 3 },
  { label: '3-6 tuổi', min: 3, max: 6 },
  { label: '6-12 tuổi', min: 6, max: 12 },
  { label: '12+ tuổi', min: 12, max: 18 },
] as const

export const RATING_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Rất tốt',
} as const
