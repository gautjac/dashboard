declare module 'netlify-identity-widget' {
  export interface User {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
    app_metadata?: {
      provider?: string;
      roles?: string[];
    };
    token?: {
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      expires_at: number;
    };
    created_at: string;
    confirmed_at?: string;
    updated_at?: string;
  }

  interface InitOptions {
    APIUrl?: string;
    logo?: boolean;
    namePlaceholder?: string;
  }

  function init(options?: InitOptions): void;
  function open(tab?: 'login' | 'signup'): void;
  function close(): void;
  function logout(): void;
  function currentUser(): User | null;
  function on(event: 'login' | 'logout' | 'error' | 'open' | 'close', callback: (user?: User) => void): void;
  function off(event: 'login' | 'logout' | 'error' | 'open' | 'close', callback: (user?: User) => void): void;

  export default {
    init,
    open,
    close,
    logout,
    currentUser,
    on,
    off,
  };
}
