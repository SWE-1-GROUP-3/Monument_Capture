import { Redirect } from "expo-router";
import type { ReactNode } from "react";

import { useCurrentUser } from "../demo/store";
import type { Role, User } from "../demo/types";
import { Screen } from "./Screen";
import { Banner } from "./ui";

/** Sends signed-out visitors to /login and blocks screens meant for another role. */
export function RequireUser({ role, children }: { role?: Role; children: (user: User) => ReactNode }) {
  const user = useCurrentUser();
  if (!user) return <Redirect href="/login" />;
  if (role && user.role !== role) {
    return (
      <Screen title="Not available" back>
        <Banner tone="warning">{`This screen is only for ${role}s. Switch account from Profile to use it.`}</Banner>
      </Screen>
    );
  }
  return <>{children(user)}</>;
}
