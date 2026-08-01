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

   // Silently attempt a refresh on app load using the httpOnly cookie,
    // then fetch the profile so the app can restore full session state
    // (not just a token) after a page reload.
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.data.accessToken);
        const me = await api.get("/auth/me");
        setUser(me.data.data.user);
      } catch {
        // no valid session
      } finally {
        setIsLoading(false);
      }
    })();

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
