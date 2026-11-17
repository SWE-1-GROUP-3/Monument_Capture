import { useLocalSearchParams } from "expo-router";

import { RequireUser } from "../src/components/RequireUser";
import { GameHome } from "../src/game/GameHome";
import { SHEET_KINDS, type SheetKind } from "../src/game/types";

// The map is the home screen. ?sheet=records|activity|queue|monuments|profile
// or ?monument=<id>[&submitted=1] open a sheet on arrival.
export default function HomeRoute() {
  const params = useLocalSearchParams<{ sheet?: string; monument?: string; submitted?: string }>();
  const sheet = SHEET_KINDS.includes(params.sheet as SheetKind) ? (params.sheet as SheetKind) : undefined;
  return (
    <RequireUser>
      {(user) => (
        <GameHome
          key={`${user.id}:${params.monument ?? ""}:${params.submitted ?? ""}:${sheet ?? ""}`}
          user={user}
          initialSheet={sheet}
          initialMonumentId={typeof params.monument === "string" && params.monument ? params.monument : undefined}
          justSubmitted={params.submitted === "1"}
        />
      )}
    </RequireUser>
  );
}
