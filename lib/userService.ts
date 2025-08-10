import { supabase } from './supabase'
import { UserProfile, CreateUserProfile, UpdateUserProfile, UserStats } from '@/types/user'

export class UserService {
  // Get current user's profile
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getCurrentUserProfile:', error)
      return null
    }
  }

  // Create or update user profile
  static async upsertUserProfile(profile: CreateUserProfile): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          ...profile
        }, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error upserting user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in upsertUserProfile:', error)
      return null
    }
  }

  // Update user profile
  static async updateUserProfile(updates: UpdateUserProfile): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      return null
    }
  }

  // Increment document view count
  static async incrementDocumentView(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('user_profiles')
        .update({
          documents_viewed: supabase.rpc('increment', { row_id: user.id, column_name: 'documents_viewed' })
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error incrementing document view:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in incrementDocumentView:', error)
      return false
    }
  }

  // Increment document download count
  static async incrementDocumentDownload(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('user_profiles')
        .update({
          documents_downloaded: supabase.rpc('increment', { row_id: user.id, column_name: 'documents_downloaded' })
        })
        .eq('id', user.id)

      if (error) {
        console.error('Error incrementing document download:', error)
        return false
      }

      return true
      } catch (error) {
        console.error('Error in incrementDocumentDownload:', error)
        return false
      }
  }

  // Get user stats
  static async getUserStats(): Promise<UserStats | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('documents_viewed, documents_downloaded, documents_uploaded')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user stats:', error)
        return null
      }

      const remainingFreeViews = Math.max(0, 20 - data.documents_viewed)

      return {
        ...data,
        remaining_free_views: remainingFreeViews
      }
    } catch (error) {
      console.error('Error in getUserStats:', error)
      return null
    }
  }

  // Check if user has exceeded free limit
  static async hasExceededFreeLimit(): Promise<boolean> {
    try {
      const stats = await this.getUserStats()
      if (!stats) return true

      return stats.documents_viewed >= 20
    } catch (error) {
      console.error('Error in hasExceededFreeLimit:', error)
      return true
    }
  }
}
