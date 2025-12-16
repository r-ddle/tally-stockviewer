export const AVAILABILITIES = ["IN_STOCK", "OUT_OF_STOCK", "NEGATIVE", "UNKNOWN"] as const;
export type Availability = (typeof AVAILABILITIES)[number];

