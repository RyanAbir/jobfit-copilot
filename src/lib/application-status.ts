export const APPLICATION_STATUSES = [
  "Draft",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus);
}
