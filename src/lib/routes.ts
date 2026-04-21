export type SessionArea = "submit" | "wall" | "admin";

export function buildSessionPath(area: SessionArea, sessionCode: string) {
  return `/${area}/${encodeURIComponent(sessionCode)}`;
}
