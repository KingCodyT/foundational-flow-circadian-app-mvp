// Basic solar timing utilities adapted from NOAA algorithms.
// Returns times in local Date objects.

function toJulian(day: Date) {
  return day.getTime() / 86400000 + 2440587.5;
}

function toJulianCentury(jd: number) {
  return (jd - 2451545.0) / 36525.0;
}

function degToRad(d: number) {
  return (d * Math.PI) / 180.0;
}

function radToDeg(r: number) {
  return (r * 180.0) / Math.PI;
}

function normalizeAngle(angle: number) {
  return (angle % 360 + 360) % 360;
}

function sinDeg(d: number) {
  return Math.sin(degToRad(d));
}

function cosDeg(d: number) {
  return Math.cos(degToRad(d));
}

function calcGeomMeanLongSun(tc: number) {
  return normalizeAngle(280.46646 + tc * (36000.76983 + tc * 0.0003032));
}

function calcGeomMeanAnomalySun(tc: number) {
  return 357.52911 + tc * (35999.05029 - 0.0001537 * tc);
}

function calcEccentricityEarthOrbit(tc: number) {
  return 0.016708634 - tc * (0.000042037 + 0.0000001267 * tc);
}

function calcSunEqOfCenter(tc: number, m: number) {
  return (
    sinDeg(m) * (1.914602 - tc * (0.004817 + 0.000014 * tc)) +
    sinDeg(2 * m) * (0.019993 - 0.000101 * tc) +
    sinDeg(3 * m) * 0.000289
  );
}

function calcSunTrueLong(l0: number, c: number) {
  return l0 + c;
}

function calcSunApparentLong(o: number, tc: number) {
  const omega = 125.04 - 1934.136 * tc;
  return o - 0.00569 - 0.00478 * sinDeg(omega);
}

function calcMeanObliquityOfEcliptic(tc: number) {
  return 23 + (26 + ((21.448 - tc * (46.815 + tc * (0.00059 - tc * 0.001813))) / 60)) / 60;
}

function calcObliquityCorrection(tc: number, e0: number) {
  const omega = 125.04 - 1934.136 * tc;
  return e0 + 0.00256 * cosDeg(omega);
}

function calcSunDeclination(e: number, lam: number) {
  return radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(lam))));
}

function calcEquationOfTime(tc: number, l0: number, e: number, m: number) {
  const y = Math.tan(degToRad(e) / 2.0);
  const y2 = y * y;
  const sin2l0 = sinDeg(2 * l0);
  const sinm = sinDeg(m);
  const cos2l0 = cosDeg(2 * l0);
  const sin4l0 = sinDeg(4 * l0);
  const sin2m = sinDeg(2 * m);
  const Etime =
    y2 * sin2l0 - 2 * calcEccentricityEarthOrbit(tc) * sinm + 4 * calcEccentricityEarthOrbit(tc) * y2 * sinm * cos2l0 - 0.5 * y2 * y2 * sin4l0 - 1.25 * calcEccentricityEarthOrbit(tc) * calcEccentricityEarthOrbit(tc) * sin2m;
  return radToDeg(Etime) * 4.0; // in minutes
}

function hourAngleSunrise(lat: number, solarDec: number, solarZenith = 90.833) {
  const latRad = degToRad(lat);
  const sdRad = degToRad(solarDec);
  const HA = Math.acos((Math.cos(degToRad(solarZenith)) - Math.sin(latRad) * Math.sin(sdRad)) / (Math.cos(latRad) * Math.cos(sdRad)));
  return radToDeg(HA);
}

export type SolarTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  dayLengthMinutes: number | null;
};

export function getSolarTimes(date: Date, latitude?: number | null, longitude?: number | null): SolarTimes {
  if (latitude == null || longitude == null) {
    return { sunrise: null, sunset: null, solarNoon: null, dayLengthMinutes: null };
  }

  // Work in UTC fractional days using Julian dates
  const jd = toJulian(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)));
  const t = toJulianCentury(jd);

  const L0 = calcGeomMeanLongSun(t);
  const M = calcGeomMeanAnomalySun(t);
  const e = calcObliquityCorrection(t, calcMeanObliquityOfEcliptic(t));
  const C = calcSunEqOfCenter(t, M);
  const O = calcSunTrueLong(L0, C);
  const lambda = calcSunApparentLong(O, t);
  const solarDec = calcSunDeclination(e, lambda);
  const eqTime = calcEquationOfTime(t, L0, e, M);

  // solar noon (approx) in minutes from UTC
  const lngHour = longitude / 15.0;
  const tnoon = (720 - 4.0 * longitude - eqTime); // minutes

  const solarNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  solarNoon.setMinutes(solarNoon.getMinutes() + Math.round(tnoon));

  // hour angle
  let ha = hourAngleSunrise(latitude, solarDec); // degrees
  const delta = Math.round((ha * 4)); // minutes from solar noon to sunrise/sunset

  const sunrise = new Date(solarNoon.getTime());
  sunrise.setMinutes(sunrise.getMinutes() - delta);
  const sunset = new Date(solarNoon.getTime());
  sunset.setMinutes(sunset.getMinutes() + delta);

  const dayLengthMinutes = (sunset.getTime() - sunrise.getTime()) / 60000;

  return { sunrise, sunset, solarNoon, dayLengthMinutes };
}

export function formatTimeLocal(d: Date | null) {
  if (!d) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
