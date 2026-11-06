export function distanceMeters(a, b) {
  const rad = v => v * Math.PI / 180;
  const deltaLat = rad(b.lat - a.lat), deltaLng = rad(b.lng - a.lng);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}

export function simulatedUnit(point, dispatch, now = Date.now()) {
  const fraction = Math.max(0, Math.min(1, (now - Date.parse(dispatch.startedAt)) / 45000));
  const position = { lat: point.lat + .0048 * (1 - fraction), lng: point.lng + .002 * (1 - fraction) };
  return { id: dispatch.unitId, label: dispatch.unitLabel, officerName: dispatch.officerName,
    position, distanceMeters: distanceMeters(position, point), dispatchId: dispatch.dispatchId };
}
