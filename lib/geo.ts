// サンワテック 会社座標（仮）
export const COMPANY_LAT = 35.05;
export const COMPANY_LNG = 137.01;
export const ALLOWED_RADIUS_METERS = 100;

export function calcDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinCompany(lat: number, lng: number): boolean {
  return (
    calcDistanceMeters(lat, lng, COMPANY_LAT, COMPANY_LNG) <=
    ALLOWED_RADIUS_METERS
  );
}
