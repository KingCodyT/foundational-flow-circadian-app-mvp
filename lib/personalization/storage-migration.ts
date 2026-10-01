import { STORAGE_KEY, type LocalAuditState } from "../audit-store";

export const STORAGE_SCHEMA_VERSION = 2 as const;
export const RECOVERY_KEY = `${STORAGE_KEY}:recovery:v2`;
type ObjectValue = Record<string, unknown>;
export type AcceptedFocus = {
  version: 1;
  status: "unset" | "accepted";
  signalId: string | null;
  acceptedAt: string | null;
  source: "uninitialized" | "legacy-profile" | "explicit";
  [key: string]: unknown;
};
/** Stored checkpoint only. Stage 1 does not execute or recompute personalization. */
export type StoredRuntime = ObjectValue & {
  version: 1;
  inputKey: string;
  state: ObjectValue & { perSignal: Record<string, ObjectValue> };
  acceptedAnswers: Record<string, string>;
  evidenceKeys: Record<string, string>;
};
export type CombinedStorage = LocalAuditState & {
  schemaVersion: 2;
  acceptedFocus: AcceptedFocus;
};
export type StorageIssue = "malformed" | "unsupported-version" | "read-failed" | "backup-failed" | "write-failed" | "concurrent-change" | "not-hydrated";
export type DecodedStorage = { status: "ready"; state: CombinedStorage; migrated: boolean }
  | { status: "blocked"; issue: StorageIssue };
const object = (v: unknown): v is ObjectValue => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const nullableString = (v: unknown) => v == null || typeof v === "string";
const date = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
const optionalDate = (v: unknown) => v == null || date(v);
const stringList = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === "string");
const strings = (v: unknown) => object(v) && Object.values(v).every(x => typeof x === "string");
const records = (v: unknown): v is Record<string, ObjectValue> => object(v) && Object.values(v).every(object);
const arrays = (v: unknown) => object(v) && Object.values(v).every(x => Array.isArray(x) && x.every(object));
function zone(v: unknown) {
  if (v == null) return true;
  if (typeof v !== "string") return false;
  try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; }
}
function context(v: unknown): boolean {
  return v == null || object(v) && zone(v.timeZone) &&
    ["latitude", "longitude", "dayLengthMinutes"].every(k => v[k] == null || typeof v[k] === "number" && Number.isFinite(v[k])) &&
    ["wakeTime", "targetBedtime"].every(k => nullableString(v[k])) && optionalDate(v.capturedAt);
}
function validProfile(v: unknown): boolean {
  if (v == null) return true;
  if (!object(v) || !context(v)) return false;
  const textFields = ["displayName", "dateOfBirth", "gender", "activityLevel", "locationLabel", "temperatureUnit", "timeFormat", "firstCaffeineTime", "napPattern", "typicalEnvironment", "elevation", "caffeineUse", "realityNotes", "foodTimingGoal", "coachingTargetSignalId", "lastMealTime", "workStructure", "travelFrequency", "exercisePattern", "sleepEnvironment"];
  return textFields.every(k => nullableString(v[k])) &&
    ["locationPermissionGranted", "upcomingTravel", "showPerspective", "remindersEnabled"].every(k => v[k] == null || typeof v[k] === "boolean");
}
function dateBuckets(v: ObjectValue) {
  return Object.keys(v).every(key => /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    Number.isFinite(Date.parse(key)) && new Date(key).toISOString().slice(0, 10) === key);
}
function validFood(v: unknown): boolean {
  if (v == null) return true;
  return object(v) && dateBuckets(v) && Object.values(v).every(bucket => Array.isArray(bucket) && bucket.every(e => {
    if (!object(e) || typeof e.id !== "string" || !e.id || !["MEAL_STARTED", "NOT_YET", "EATING_LATER"].includes(String(e.action)) || e.source !== "USER" || !date(e.at) || !optionalDate(e.recordedAt) || !optionalDate(e.updatedAt)) return false;
    const c = e.historicalContext;
    return c == null || object(c) && context(c) && ["wakeAt", "morningLightAt", "sunriseAt", "sunsetAt", "targetSleepAt"].every(k => optionalDate(c[k]));
  }));
}
function validEvents(v: unknown): boolean {
  return v == null || object(v) && dateBuckets(v) && Object.values(v).every(day => object(day) && Object.values(day).every(e => object(e) &&
    ["upcoming", "active", "current", "completed", "skipped", "missed"].includes(String(e.status)) && optionalDate(e.at) && optionalDate(e.remindAt)));
}
function validRuntime(v: unknown): boolean {
  if (v == null) return true;
  if (!object(v) || v.version !== 1 || typeof v.inputKey !== "string" || !object(v.state) || !records(v.state.perSignal)) return false;
  if (!["observedAnswers", "acceptedAnswers", "acknowledgedHistory", "evidenceKeys"].every(k => strings(v[k])) || !records(v.baselines) || !Object.values(v.baselines).every(context) || !arrays(v.history) || !Array.isArray(v.resolutions) || !v.resolutions.every(object)) return false;
  return Object.values(v.state.perSignal).every(s => {
    if (!object(s) || !Array.isArray(s.evidence) || !s.evidence.every(object)) return false;
    if (s.coachingState != null && !["ESTABLISHED", "DEVELOPING", "NEEDS_ATTENTION", "DISRUPTED"].includes(String(s.coachingState))) return false;
    if (s.confidence != null && (!object(s.confidence) || typeof s.confidence.score !== "number" || s.confidence.score < 0 || s.confidence.score > 1 || !optionalDate(s.confidence.lastEvidenceAt))) return false;
    const r = s.reconsideration;
    return r == null || object(r) && Array.isArray(r.reasons) && r.reasons.every(x => typeof x === "string") && Array.isArray(r.evidence) && r.evidence.every(object);
  });
}
function validFocus(v: unknown): v is AcceptedFocus {
  return object(v) && v.version === 1 && Object.hasOwn(v, "signalId") && Object.hasOwn(v, "acceptedAt") && ["unset", "accepted"].includes(String(v.status)) && nullableString(v.signalId) &&
    optionalDate(v.acceptedAt) && ["uninitialized", "legacy-profile", "explicit"].includes(String(v.source)) &&
    (v.status === "unset" ? v.signalId === null && v.acceptedAt === null && v.source === "uninitialized" : v.source !== "uninitialized");
}
function validHandoff(v: unknown): boolean {
  if (v == null) return true;
  if (!object(v)) return false;
  const g = v.guidance;
  return g == null || object(g) && ["eventId", "dateKey", "action", "reason", "focus", "profileKey"].every(k => typeof g[k] === "string") && date(g.start) && date(g.end);
}
function validWearable(v: unknown): boolean {
  return v == null || object(v) &&
    ["enabled", "sessionVerified"].every(k => v[k] == null || typeof v[k] === "boolean") &&
    ["providerId", "status"].every(k => nullableString(v[k])) && optionalDate(v.lastSyncedAt) &&
    (v.revision == null || Number.isSafeInteger(v.revision)) &&
    ["supportedCategories", "grantedCategories"].every(k => v[k] == null || stringList(v[k])) &&
    (v.sharedData == null || object(v.sharedData) && Object.values(v.sharedData).every(x => typeof x === "boolean")) &&
    (v.observations == null || Array.isArray(v.observations) && v.observations.every(object));
}
function validNotificationRecord(v: unknown): boolean {
  return v == null || object(v) &&
    ["id", "targetSignalId", "eventId", "channel", "title", "body", "status", "reason", "actionToken", "dateKey"].every(k => nullableString(v[k])) &&
    ["at", "scheduledFor", "validUntil", "deliveredAt"].every(k => optionalDate(v[k]));
}
function validNotifications(v: unknown): boolean {
  return v == null || object(v) &&
    ["scheduledNotification", "lastNotification", "deliveryStatus"].every(k => validNotificationRecord(v[k])) &&
    (v.deliveredNotifications == null || Array.isArray(v.deliveredNotifications) && v.deliveredNotifications.every(x => object(x) && validNotificationRecord(x))) &&
    (v.materialChangeKeys == null || strings(v.materialChangeKeys));
}
function validState(v: ObjectValue): boolean {
  return (v.clientId == null || typeof v.clientId === "string") && (v.answers == null || strings(v.answers)) &&
    (v.hasCompletedAudit == null || typeof v.hasCompletedAudit === "boolean") && optionalDate(v.lastSavedAt) &&
    (v.participationLevel == null || ["BASELINE", "GUIDED_FLOW", "FULL_FLOW"].includes(String(v.participationLevel))) &&
    validProfile(v.dailyProfile) && validEvents(v.eventStateByDate) && validFood(v.foodTimingEvidenceByDate) &&
    context(v.previousContextSnapshot) && context(v.currentContextSnapshot) && validNotifications(v.notificationState) &&
    validHandoff(v.firstRunHandoff) && validWearable(v.wearableConnection) &&
    (v.assessmentEvidenceHistory == null || arrays(v.assessmentEvidenceHistory)) && validRuntime(v.personalizationRuntime) &&
    (v.acceptedFocus === undefined || validFocus(v.acceptedFocus)) &&
    (v.runtimeMigration === undefined || object(v.runtimeMigration) && v.runtimeMigration.version === 1 &&
      typeof v.runtimeMigration.rebuildRequired === "boolean" && Array.isArray(v.runtimeMigration.unassessedPendingSignalIds) && v.runtimeMigration.unassessedPendingSignalIds.every(x => typeof x === "string"));
}

/** Pure, idempotent and additive: no clock, environment, target ranking, or evidence inference. */
export function decodeStorage(raw: string | null): DecodedStorage {
  let parsed: unknown;
  try { parsed = raw === null ? {} : JSON.parse(raw); } catch { return { status: "blocked", issue: "malformed" }; }
  if (!object(parsed)) return { status: "blocked", issue: "malformed" };
  if (parsed.schemaVersion !== undefined && parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2 ||
      object(parsed.personalizationRuntime) && parsed.personalizationRuntime.version !== 1 ||
      object(parsed.acceptedFocus) && parsed.acceptedFocus.version !== 1) return { status: "blocked", issue: "unsupported-version" };
  if (object(parsed.runtimeMigration) && parsed.runtimeMigration.version !== 1) return { status: "blocked", issue: "unsupported-version" };
  if (!validState(parsed)) return { status: "blocked", issue: "malformed" };
  const profile = object(parsed.dailyProfile) ? parsed.dailyProfile : {};
  const hasFocus = Object.hasOwn(profile, "coachingTargetSignalId") && profile.coachingTargetSignalId !== undefined;
  const acceptedFocus: AcceptedFocus = validFocus(parsed.acceptedFocus) ? parsed.acceptedFocus : {
    version: 1, status: hasFocus ? "accepted" : "unset", signalId: hasFocus ? profile.coachingTargetSignalId as string | null : null,
    acceptedAt: null, source: hasFocus ? "legacy-profile" : "uninitialized",
  };
  const state = { ...parsed, schemaVersion: 2, clientId: parsed.clientId ?? "", answers: parsed.answers ?? {},
    hasCompletedAudit: parsed.hasCompletedAudit ?? false, lastSavedAt: parsed.lastSavedAt ?? null, acceptedFocus } as CombinedStorage;
  if (state.personalizationRuntime && (parsed.schemaVersion !== 2 || !parsed.runtimeMigration)) {
    const runtime = state.personalizationRuntime;
    const pendingEmpty = Object.entries(runtime.state.perSignal).filter(([, s]) =>
      s.classification === "BEHAVIOR" && s.coachingState == null && object(s.reconsideration) &&
      Array.isArray(s.evidence) && s.evidence.length > 0 && s.evidence.every(e => object(e) && e.answer == null && e.answerScore == null) &&
      s.evidence.some(e => object(e) && typeof e.questionId === "string" && Boolean(runtime.acceptedAnswers[e.questionId]))
    ).map(([id]) => id);
    // Invalidate obsolete cache keys, not accepted interpretation. The corrected Stage 2
    // runtime will initialize these placeholders from retained evidence on its first rebuild.
    state.personalizationRuntime = { ...runtime, inputKey: "", evidenceKeys: Object.fromEntries(Object.entries(runtime.evidenceKeys).filter(([id]) => !pendingEmpty.includes(id))) };
    state.runtimeMigration = { version: 1, rebuildRequired: true, unassessedPendingSignalIds: pendingEmpty };
  }
  return { status: "ready", state, migrated: !same(parsed, state) };
}

/** Three-way merge: normalized display state must not erase fields/records it never exposed.
 * Explicit changes/removals to previously visible fields still apply (including meal deletion).
 */
export function mergeRetained(original: unknown, before: unknown, after: unknown, path: string[] = []): unknown {
  if (same(before, after)) return original;
  if (object(original) && object(before) && object(after)) {
    // Dictionary removals are meaningful (deleted meals/events/keys). Omitted
    // fields in a typed record are retained: an older UI may not know them.
    const dictionary = path.length === 1 && ["answers", "foodTimingEvidenceByDate", "eventStateByDate"].includes(path[0]) ||
      path.length === 2 && (path[0] === "eventStateByDate" || path.join(".") === "notificationState.materialChangeKeys");
    return Object.fromEntries([...new Set([...Object.keys(original), ...Object.keys(after)])]
      .filter(k => !dictionary || !Object.hasOwn(before, k) || Object.hasOwn(after, k))
      .map(k => [k, Object.hasOwn(after, k) ? (Object.hasOwn(before, k) ? mergeRetained(original[k], before[k], after[k], [...path, k]) : after[k]) : original[k]]));
  }
  const identified = (v: unknown): v is (ObjectValue & { id: string })[] => Array.isArray(v) && v.every(x => object(x) && typeof x.id === "string");
  if (identified(original) && identified(before) && identified(after)) {
    const old = new Map(before.map(x => [x.id, x]));
    const next = new Map(after.map(x => [x.id, x]));
    const existing = new Set(original.map(x => x.id));
    return [...original.filter(x => !old.has(x.id) || next.has(x.id)).map(x => next.has(x.id) ? mergeRetained(x, old.get(x.id) ?? {}, next.get(x.id), [...path, "[]"]) : x), ...after.filter(x => !existing.has(x.id))];
  }
  return after;
}

export type StoragePort = Pick<Storage, "getItem" | "setItem">;
/** Owns persistence only, not personalization. Failed writes leave the baseline retryable. */
export function createStorageSession(getStorage: () => StoragePort) {
  let ready = false;
  let sourceRaw: string | null = null;
  let state: CombinedStorage;
  let view: LocalAuditState | undefined;
  let needsBackup = false;
  let resetRequested = false;
  let port: StoragePort;
  function hydrate(): DecodedStorage {
    if (ready) return { status: "ready", state, migrated: needsBackup };
    try { port = getStorage(); sourceRaw = port.getItem(STORAGE_KEY); } catch { return { status: "blocked", issue: "read-failed" }; }
    const decoded = decodeStorage(sourceRaw);
    if (decoded.status === "ready") { state = decoded.state; needsBackup = decoded.migrated && sourceRaw !== null; ready = true; }
    return decoded;
  }
  function save(nextView: LocalAuditState): { status: "saved" } | { status: "blocked"; issue: StorageIssue } {
    if (!ready) return { status: "blocked", issue: "not-hydrated" };
    // First view is the normalized projection, never a reason to replace the source.
    if (!view) view = nextView;
    const reset = resetRequested ? decodeStorage(JSON.stringify(nextView)) : null;
    if (reset?.status === "blocked") return reset;
    const candidate = { ...(reset?.status === "ready" ? reset.state : mergeRetained(state, view, nextView) as CombinedStorage) };
    // A fresh install has no client id in its source; the provider generates it once.
    if (!candidate.clientId && nextView.clientId) candidate.clientId = nextView.clientId;
    if (!validState(candidate)) return { status: "blocked", issue: "malformed" };
    let serialized: string;
    try { serialized = JSON.stringify(candidate); } catch { return { status: "blocked", issue: "write-failed" }; }
    try { if (port.getItem(STORAGE_KEY) !== sourceRaw) return { status: "blocked", issue: "concurrent-change" }; }
    catch { return { status: "blocked", issue: "read-failed" }; }
    if (needsBackup && sourceRaw !== null) {
      try {
        const existing = port.getItem(RECOVERY_KEY);
        const recovery = existing === null ? { version: 1, originals: [] as string[] } : JSON.parse(existing);
        if (!object(recovery) || recovery.version !== 1 || !Array.isArray(recovery.originals) || !recovery.originals.every(x => typeof x === "string")) throw new Error("Invalid recovery record");
        if (!recovery.originals.includes(sourceRaw)) {
          recovery.originals.push(sourceRaw);
          port.setItem(RECOVERY_KEY, JSON.stringify(recovery));
        }
        if (port.getItem(RECOVERY_KEY) !== JSON.stringify(recovery)) throw new Error("Recovery verification failed");
      } catch { return { status: "blocked", issue: "backup-failed" }; }
    }
    try {
      if (port.getItem(STORAGE_KEY) !== sourceRaw) return { status: "blocked", issue: "concurrent-change" };
      if (serialized !== sourceRaw) port.setItem(STORAGE_KEY, serialized);
    } catch { return { status: "blocked", issue: "write-failed" }; }
    sourceRaw = serialized; state = candidate; view = nextView; needsBackup = false; resetRequested = false;
    return { status: "saved" };
  }
  function requestReset() {
    if (!ready) return;
    resetRequested = true;
    needsBackup = sourceRaw !== null;
  }
  return { hydrate, save, requestReset };
}
