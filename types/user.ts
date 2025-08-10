export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  institution?: string
  role?: 'student' | 'teacher' | 'admin'
  created_at: string
  updated_at: string
  documents_viewed: number
  documents_downloaded: number
  is_premium: boolean
  subscription_tier?: 'free' | 'basic' | 'premium'
}

export interface CreateUserProfile {
  email: string
  full_name?: string
  avatar_url?: string
  institution?: string
  role?: 'student' | 'teacher' | 'admin'
}

export interface UpdateUserProfile {
  full_name?: string
  avatar_url?: string
  institution?: string
  role?: 'student' | 'teacher' | 'admin'
}

export interface UserStats {
  documents_viewed: number
  documents_downloaded: number
  documents_uploaded: number
  remaining_free_views: number
}
