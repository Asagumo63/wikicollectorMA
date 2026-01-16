import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignIn,
} from 'aws-amplify/auth';
import type { User } from '../types';

export class AuthService {
  static async signIn(username: string, password: string) {
    const result = await amplifySignIn({ username, password });
    return result;
  }

  static async signOut(): Promise<void> {
    await amplifySignOut();
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      return {
        username: user.username,
        attributes: user as unknown as Record<string, unknown>,
      };
    } catch (error) {
      console.error('[AuthService] getCurrentUser error:', error);
      return null;
    }
  }

  static async checkAuth(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens;
    } catch (error) {
      console.error('[AuthService] checkAuth error:', error);
      return false;
    }
  }

  static async getUserGroups(): Promise<string[]> {
    try {
      const session = await fetchAuthSession();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] as string[];
      return groups || [];
    } catch (error) {
      console.error('[AuthService] getUserGroups error:', error);
      return [];
    }
  }

  static async confirmNewPassword(newPassword: string) {
    const result = await confirmSignIn({ challengeResponse: newPassword });
    return result;
  }
}
