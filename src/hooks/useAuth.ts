import { useEffect, useState } from 'react';
import { mapSupabaseUser, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export const useAuth = () => {
  const { user, setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(mapSupabaseUser(session?.user ?? null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, error };
};
