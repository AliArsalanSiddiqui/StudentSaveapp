import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types/index';

interface AuthState {
  user: User | null;
  session: any;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  setUser: (user) => set({ user }),

  setSession: (session) => set({ session }),
}));