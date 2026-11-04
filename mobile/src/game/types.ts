import type { User } from "../demo/types";

export type SheetKind = "profile" | "records" | "activity" | "queue" | "monuments";

export type SheetId = { kind: "monument"; id: string } | { kind: SheetKind };

export type GameHomeProps = {
  user: User;
  /** Sheet to open on arrival, e.g. from ?sheet=queue. */
  initialSheet?: SheetKind;
  /** Monument sheet to open on arrival, e.g. after submitting a capture. */
  initialMonumentId?: string;
  /** Shows the "Submitted!" hint on the monument sheet. */
  justSubmitted?: boolean;
};

export const SHEET_KINDS: SheetKind[] = ["profile", "records", "activity", "queue", "monuments"];
