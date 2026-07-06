import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-') &&
  !supabaseAnonKey.includes('your-')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const getSupabaseClient = () => (isSupabaseConfigured ? supabase : null);

export const mapSupabaseUser = (user: SupabaseUser | null | undefined): User | null => {
  if (!user) return null;

  const role = (user.user_metadata?.role as User['role'] | undefined) ?? 'buyer';

  return {
    id: user.id,
    email: user.email || '',
    full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
    avatar_url: user.user_metadata?.avatar_url as string | undefined,
    bio: user.user_metadata?.bio as string | undefined,
    location: user.user_metadata?.location as string | undefined,
    phone: user.user_metadata?.phone as string | undefined,
    role,
    is_verified: Boolean(user.email_confirmed_at),
    rating: 0,
    reviews_count: 0,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
};

// Export utility functions for common operations
export const signUp = async (email: string, password: string, fullName: string, role: User['role'] = 'buyer') => {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured yet.' } } as any;
  }

  return await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });
};

export const signIn = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: 'Supabase is not configured yet.' } } as any;
  }

  return await client.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return { error: null } as any;
  }

  return await client.auth.signOut();
};

export const getUser = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: { user } } = await client.auth.getUser();
  return mapSupabaseUser(user);
};

export const getCurrentSession = async () => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: { session } } = await client.auth.getSession();
  return session;
};
