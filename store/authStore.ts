import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types/index';
import { clearPushToken } from '../lib/notifications';

interface AuthState {
  user: User | null;
  session: any;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,

  signInWithEmail: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'studentsave://auth/callback',
      },
    });
    return { error };
  },

  signOut: async () => {
    const currentUserId = get().user?.id;
    if (currentUserId) {
      await clearPushToken(currentUserId);
    }
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  setUser: (user) => set({ user }),

  setSession: (session) => set({ session }),
}));