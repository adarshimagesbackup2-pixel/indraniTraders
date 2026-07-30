import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, setAccessToken, setUnauthorizedHandler } from "../lib/api";

export interface AuthUser {
  id: string;
  name: string;
  role: "ADMIN" | "STAFF";
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });

    // Silently attempt a refresh on app load using the httpOnly cookie.
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.data.accessToken);
        // We don't have the user profile from /refresh alone in this API
        // contract, so a lightweight approach: keep user null until the
        // next successful /auth/login. If a persisted session should show
        // the shell immediately, the app can be extended with a /auth/me
        // endpoint; for now, treat a successful refresh as "logged out of
        // UI state but token valid" which safely falls back to the login
        // page if user is required for route rendering.
      } catch {
        // no valid session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (phone: string, password: string, rememberMe: boolean) => {
    const { data } = await api.post("/auth/login", { phone, password, rememberMe });
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
  }, []);

  const setMustChangePassword = useCallback((value: boolean) => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: value } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
