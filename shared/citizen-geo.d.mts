export type Point = { lat: number; lng: number };
export type Dispatch = { startedAt: string; unitId: string; unitLabel: string; officerName: string; dispatchId: string; patrolUserId: number | null };
export function distanceMeters(a: Point, b: Point): number;
export function simulatedUnit(point: Point, dispatch: Dispatch, now?: number): {
  id: string; label: string; officerName: string; position: Point; distanceMeters: number; dispatchId: string;
};
