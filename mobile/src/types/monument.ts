export type MonumentStatus = "Available" | "Under review" | "Captured";

export type MonumentSummary = {
  id: string;
  name: string;
  neighborhood: string;
  distance: string;
  status: MonumentStatus;
};
