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

  // Documents CRUD
  static async uploadDocument(params: {
    file: File;
    name: string;
    category: string;
    description?: string;
  }): Promise<{ id: string } | null> {
    const { file, name, category, description } = params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Not authenticated');
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name,
        category,
        description: description ?? null,
        file_path: path,
        mime_type: file.type,
        size: file.size,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Metadata insert error:', insertError);
      return null;
    }
    return { id: data.id };
  }

  static async listDocuments(params: {
    query?: string;
    category?: string;
    limit?: number;
    cursor?: string | null;
  }) {
    const { query, category, limit = 24, cursor } = params;
    let q = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      q = q.eq('category', category);
    }
    if (query && query.trim()) {
      q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (cursor) {
      q = q.lt('created_at', cursor);
    }

    const { data, error } = await q;
    if (error) {
      console.error('List documents error:', error);
      return [];
    }
    return data as Array<{
      id: string;
      user_id: string;
      name: string;
      category: string;
      description: string | null;
      file_path: string;
      mime_type: string | null;
      size: number | null;
      created_at: string;
    }>;
  }

  static getPublicUrl(filePath: string) {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  }
}
