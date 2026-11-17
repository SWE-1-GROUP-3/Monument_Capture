import type { ReactNode } from "react";

import { demo, useCurrentUser } from "../demo/store";
import type { User } from "../demo/types";

// US-01 mock authentication (originally by Iris).
// The signed-in user now lives in the shared demo store, so the tabs, role
// checks and screens all see the same session. The public API is unchanged:
// wrap the app in <AuthProvider> and call useAuth().

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | undefined;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

/** Kept so the app layout reads the same; the session itself is in the store. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthContextType {
  const user = useCurrentUser();
  return {
    isLoggedIn: !!user,
    user,
    // Mock login for the Sprint 3 frontend prototype.
    // Replace with backend authentication in a future sprint.
    login: async (email, password) => demo.login(email, password) !== null,
    logout: () => demo.logout(),
  };
}
