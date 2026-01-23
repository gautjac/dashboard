/**
 * Authentication hook using Netlify Identity
 */

import { useState, useEffect, useCallback } from 'react';
import netlifyIdentity from 'netlify-identity-widget';
import type { User } from 'netlify-identity-widget';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  signup: () => void;
}

let isInitialized = false;

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Netlify Identity only once
    if (!isInitialized) {
      netlifyIdentity.init({
        // Optional: set the API endpoint
        // APIUrl: 'https://your-site.netlify.app/.netlify/identity'
      });
      isInitialized = true;
    }

    // Check for existing user
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);

    // Listen for auth events
    const handleLogin = (loggedInUser?: User) => {
      if (loggedInUser) {
        setUser(loggedInUser);
        netlifyIdentity.close();
      }
    };

    const handleLogout = () => {
      setUser(null);
    };

    netlifyIdentity.on('login', handleLogin);
    netlifyIdentity.on('logout', handleLogout);

    // Cleanup
    return () => {
      netlifyIdentity.off('login', handleLogin);
      netlifyIdentity.off('logout', handleLogout);
    };
  }, []);

  const login = useCallback(() => {
    netlifyIdentity.open('login');
  }, []);

  const logout = useCallback(() => {
    netlifyIdentity.logout();
  }, []);

  const signup = useCallback(() => {
    netlifyIdentity.open('signup');
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    signup,
  };
}
