
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type AuthContextType = {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  async function login(email: string, password: string) {
    // Mock login for the Sprint 3 frontend prototype.
    // Replace with backend authentication in a future sprint.
    if (
      email.trim() === "demo@example.com" &&
      password === "demo123"
    ) {
      setIsLoggedIn(true);
      return true;
    }

    return false;
  }

  function logout() {
    setIsLoggedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
