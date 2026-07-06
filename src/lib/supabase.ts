import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  return await supabase.auth.signUp({
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
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return mapSupabaseUser(user);
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
