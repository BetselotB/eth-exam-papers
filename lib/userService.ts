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

  static async uploadDocuments(params: {
    files: File[];
    name: string;
    category: string;
    description?: string;
  }): Promise<{ bundleId?: string; results: Array<{ id?: string; fileName: string; error?: string }> }>
  {
    const { files, name, category, description } = params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { bundleId: undefined, results: files.map((f) => ({ fileName: f.name, error: 'Not authenticated' })) };
    }

    // Create bundle first
    const { data: bundle, error: bundleError } = await supabase
      .from('document_bundles')
      .insert({ user_id: user.id, name, category, description: description ?? null })
      .select('id')
      .single();
    if (bundleError || !bundle) {
      return { bundleId: undefined, results: files.map((f) => ({ fileName: f.name, error: bundleError?.message || 'Bundle create failed' })) };
    }

    const results: Array<{ id?: string; fileName: string; error?: string }> = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const path = `${user.id}/${bundle.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data, error: insertError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            bundle_id: bundle.id,
            name,
            category,
            description: description ?? null,
            file_path: path,
            mime_type: file.type,
            size: file.size,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        results.push({ id: data.id, fileName: file.name });
      } catch (err: any) {
        results.push({ fileName: file.name, error: err?.message || 'Upload failed' });
      }
    }

    return { bundleId: bundle.id, results };
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

  // Bundles list with first document for preview
  static async listBundles(params: {
    query?: string;
    category?: string;
    limit?: number;
    cursor?: string | null; // created_at ISO string
  }) {
    const { query, category, limit = 24, cursor } = params;

    // First fetch bundles (no nested relations to avoid PostgREST relationship issues)
    let q = supabase
      .from('document_bundles')
      .select('id, user_id, name, category, description, created_at')
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

    const { data: bundles, error } = await q;
    if (error || !bundles || bundles.length === 0) {
      if (error) console.error('List bundles error:', error);
      return [] as Array<{
        id: string;
        user_id: string;
        name: string;
        category: string;
        description: string | null;
        created_at: string;
        documents: Array<{ id: string; file_path: string; mime_type: string | null; created_at: string }>;
      }>;
    }

    const ids = bundles.map((b: any) => b.id);
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, bundle_id, file_path, mime_type, created_at')
      .in('bundle_id', ids)
      .order('created_at', { ascending: true });
    if (docsError) {
      console.error('List bundles docs error:', docsError);
    }
    const firstByBundle = new Map<string, any>();
    (docs || []).forEach((d: any) => {
      if (!firstByBundle.has(d.bundle_id)) firstByBundle.set(d.bundle_id, d);
    });

    return bundles.map((b: any) => ({
      ...b,
      documents: firstByBundle.get(b.id) ? [firstByBundle.get(b.id)] : [],
    })) as Array<{
      id: string;
      user_id: string;
      name: string;
      category: string;
      description: string | null;
      created_at: string;
      documents: Array<{ id: string; file_path: string; mime_type: string | null; created_at: string }>;
    }>;
  }

  static async getBundleWithDocuments(bundleId: string) {
    const { data, error } = await supabase
      .from('document_bundles')
      .select('id, user_id, name, category, description, created_at, documents:documents(id, file_path, mime_type, size, created_at)')
      .eq('id', bundleId)
      .single();
    if (error) {
      console.error('Get bundle error:', error);
      return null as any;
    }
    return data as {
      id: string;
      user_id: string;
      name: string;
      category: string;
      description: string | null;
      created_at: string;
      documents: Array<{ id: string; file_path: string; mime_type: string | null; size: number | null; created_at: string }>;
    };
  }

  static async getDocumentById(id: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Get document error:', error);
      return null as any;
    }
    return data as {
      id: string;
      user_id: string;
      bundle_id: string | null;
      name: string;
      category: string;
      description: string | null;
      file_path: string;
      mime_type: string | null;
      size: number | null;
      created_at: string;
    };
  }
}
