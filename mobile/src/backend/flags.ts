// What each moderator flag (set by start_capture on the server) means.
// Flags never block a capture; they tell the moderator what to look at.
export const FLAG_LABEL: Record<string, string> = {
  impossible_travel: "Impossible travel: too far from their last check-in for the time taken",
  repeated_position: "Same exact coordinates as their last check-in",
  exact_pin: "Reported position is exactly on the monument's pin",
};

export const FLAG_SHORT: Record<string, string> = {
  impossible_travel: "⚠ impossible travel",
  repeated_position: "⚠ repeated position",
  exact_pin: "⚠ exactly on the pin",
};
