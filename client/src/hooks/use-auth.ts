"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUser = localStorage.getItem("user");
    // Cookies may hold tokens even if localStorage was cleared of tokens.
    const accessToken = localStorage.getItem("accessToken");
    const hasSessionHint = Boolean(storedUser);

    if (storedUser && (accessToken || hasSessionHint)) {
      try {
        const user = JSON.parse(storedUser) as User;
        queueMicrotask(() =>
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          }),
        );
      } catch {
        queueMicrotask(() =>
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }),
        );
      }
    } else {
      queueMicrotask(() =>
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      );
    }
  }, []);

  return state;
}
