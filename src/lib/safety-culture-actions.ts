export const SAFETY_CULTURE_ACTIONS = [
  "Communicate Company Values",
  "Demonstrate Leadership Motive",
  "Clarify Required Behaviours",
  "Personalise Safety Outcomes",
  "Develop Positive Safety Attitudes",
  "Engage & Own Responsibilities",
  "Increase Hazard/Risk Awareness",
  "Improve Safety Management Knowledge",
  "Monitor, Review & Reflect",
] as const;

export type SafetyCultureAction = (typeof SAFETY_CULTURE_ACTIONS)[number];
