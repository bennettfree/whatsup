import { supabase } from './supabaseClient';
import { useAuthStore } from '@/stores';
import type { User } from '@/types';

export interface AuthCredentials {
  email: string;
  password: string;
}

export class AuthService {
  static async signIn({ email, password }: AuthCredentials) {
    const { setUser, setLoading, setError } = useAuthStore.getState();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session || !data.user) {
        throw error ?? new Error('Unable to sign in');
      }

      const supabaseUser = data.user;

      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        username: supabaseUser.email ?? '',
        displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? '',
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? '',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        savedCount: 0,
        createdAt: supabaseUser.created_at ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(user);
      setLoading(false);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while signing in.';
      setError(message);
      throw err;
    }
  }

  static async signUp({ email, password }: AuthCredentials) {
    const { setUser, setLoading, setError } = useAuthStore.getState();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error || !data.user) {
        throw error ?? new Error('Unable to sign up');
      }

      const supabaseUser = data.user;

      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        username: supabaseUser.email ?? '',
        displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? '',
        avatarUrl: '',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        savedCount: 0,
        createdAt: supabaseUser.created_at ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(user);
      setLoading(false);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while creating account.';
      setError(message);
      throw err;
    }
  }

  static async signOut() {
    const { logout, setLoading, setError } = useAuthStore.getState();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      logout();
      setLoading(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while signing out.';
      setError(message);
      throw err;
    }
  }

  static async restoreSession() {
    const { setUser, setLoading, setError } = useAuthStore.getState();
    setLoading(true);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      const supabaseUser = session?.user;

      if (!supabaseUser) {
        setUser(null);
        setLoading(false);
        return null;
      }

      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        username: supabaseUser.email ?? '',
        displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? '',
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? '',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        savedCount: 0,
        createdAt: supabaseUser.created_at ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(user);
      setLoading(false);
      return session;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to restore session.';
      setError(message);
      return null;
    }
  }
}


