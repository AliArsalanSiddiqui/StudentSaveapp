import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { User } from '../types/index';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,

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

      setUser: (user) => set({ user, loading: false }),
      
      setSession: (session) => set({ session }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);