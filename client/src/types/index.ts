export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  slug: string;
  is_public: boolean;
  parent_id: string | null;
  author: {
    id: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PageVersion {
  id: number;
  page_id: number;
  author_id: number;
  title: string;
  text: string;
  version_comment?: string;
  created_at: string;
  author: {
    username: string;
  };
}

export interface PageCollaborator {
  id: number;
  page_id: number;
  user_id: number;
  access_level: 'read' | 'write';
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface TreeNode {
  id: string;
  title: string;
  children?: TreeNode[];
  is_public: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface PagesState {
  pages: Page[];
  activePage: Page | null;
  loading: boolean;
  error: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}