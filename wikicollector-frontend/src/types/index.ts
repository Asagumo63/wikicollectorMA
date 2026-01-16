export interface User {
  username: string;
  userId: string; // Cognito sub (UUID)
  attributes?: Record<string, unknown>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Article {
  articleId: string;
  title: string;
  content?: string;
  backupContent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  articleId?: string;
  children: WikiNode[];
}
