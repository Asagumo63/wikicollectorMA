import { atom } from 'jotai';
import type { AuthState } from '../types';

export const authAtom = atom<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});
