export const WEARABLE_CATEGORIES = {
  sleep_timing: "Sleep timing",
  activity: "Activity and movement",
  resting_heart_rate: "Resting heart rate",
  hrv: "Heart-rate variability",
  temperature: "Temperature trends, when supported",
} as const;
// Ambient-light readings are deliberately excluded: consumer placement and field
// of view do not establish the light dose reaching the eyes.
export type WearableCategory = keyof typeof WEARABLE_CATEGORIES;
export type WearableStatus = "not_connected" | "connecting" | "connected" | "syncing" | "needs_attention";
export type WearableObservation = {
  id: string;
  providerId: string;
  category: WearableCategory;
  observedAt: string;
  importedAt: string;
  source: "wearable_inference";
  quality: "usable" | "low" | "unknown";
  // Preserve native metric and unit: HRV methods and temperature measures are not interchangeable.
  metric: string;
  value: number;
  unit: string;
  independentSourceId: string;
};
export type WearableConnection = {
  enabled: boolean;
  sessionVerified: boolean;
  providerId: string | null;
  status: WearableStatus;
  supportedCategories: WearableCategory[];
  grantedCategories: WearableCategory[];
  sharedData: Record<WearableCategory, boolean>;
  lastSyncedAt: string | null;
  observations: WearableObservation[];
  revision: number;
};
export type ProviderSession = {
  connected: boolean;
  supportedCategories: WearableCategory[];
  grantedCategories: WearableCategory[];
};
/** Implement in a native bridge or authenticated backend. Never return credentials to localStorage. */
export interface WearableProvider {
  readonly id: string;
  readonly name: string;
  connect(categories: WearableCategory[]): Promise<ProviderSession>;
  getSession(): Promise<ProviderSession>;
  chooseSharedData(categories: WearableCategory[]): Promise<ProviderSession>;
  sync(categories: WearableCategory[], signal: AbortSignal): Promise<WearableObservation[]>;
  disconnect(): Promise<void>;
  deleteImportedData(): Promise<void>;
}
// Register only real, configured adapters. No demos or fabricated data in the application.
export const WEARABLE_PROVIDERS: readonly WearableProvider[] = [];
const categories = Object.keys(WEARABLE_CATEGORIES) as WearableCategory[];
const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const categoryList = (value: unknown): WearableCategory[] => Array.isArray(value) ? categories.filter(c => value.includes(c)) : [];
export function defaultWearableConnection(): WearableConnection {
  return { enabled: false, sessionVerified: false, providerId: null, status: "not_connected", supportedCategories: [], grantedCategories: [],
    sharedData: Object.fromEntries(categories.map(c => [c, false])) as Record<WearableCategory, boolean>,
    lastSyncedAt: null, observations: [], revision: 0 };
}
function validObservation(item: WearableObservation): boolean {
  return Boolean(item && typeof item.id === "string" && typeof item.providerId === "string" && categories.includes(item.category) &&
    item.source === "wearable_inference" && ["usable", "low", "unknown"].includes(item.quality) &&
    validDate(item.observedAt) && validDate(item.importedAt) && typeof item.metric === "string" &&
    Number.isFinite(item.value) && typeof item.unit === "string" && typeof item.independentSourceId === "string");
}
/** Persist preferences and history; a previous browser session never proves a live provider connection. */
export function normalizeWearableConnection(value?: Partial<WearableConnection> | null): WearableConnection {
  const initial = defaultWearableConnection();
  if (!value || typeof value !== "object") return initial;
  return { ...initial, enabled: value.enabled === true,
    providerId: typeof value.providerId === "string" ? value.providerId : null,
    status: value.enabled && value.providerId ? "needs_attention" : "not_connected",
    sharedData: Object.fromEntries(categories.map(c => [c, value.sharedData?.[c] === true])) as Record<WearableCategory, boolean>,
    lastSyncedAt: validDate(value.lastSyncedAt) ? value.lastSyncedAt : null,
    observations: Array.isArray(value.observations) ? value.observations.filter(validObservation) : [],
    revision: Number.isSafeInteger(value.revision) && value.revision! >= 0 ? value.revision! + 1 : 0,
  };
}
export type WearableAction =
  | { type: "connecting"; providerId: string }
  | { type: "enable"; enabled: boolean }
  | { type: "share"; category: WearableCategory; enabled: boolean }
  | { type: "disconnect" }
  | { type: "delete_data" }
  | { type: "verified"; providerId: string; session: ProviderSession; revision: number }
  | { type: "syncing"; revision: number }
  | { type: "synced"; providerId: string; revision: number; at: string; observations: WearableObservation[] }
  | { type: "attention"; revision: number };
export function updateWearableConnection(state: WearableConnection, action: WearableAction,
  providers: readonly WearableProvider[] = WEARABLE_PROVIDERS): WearableConnection {
  const changed = { ...state, revision: state.revision + 1 };
  switch (action.type) {
    case "connecting": {
      if (!providers.some(provider => provider.id === action.providerId)) return state;
      return { ...changed, enabled: true, sessionVerified: false, providerId: action.providerId,
        status: "connecting", supportedCategories: [], grantedCategories: [] };
    }
    case "enable": return { ...changed, enabled: action.enabled, sessionVerified: false,
      status: "not_connected", providerId: action.enabled ? state.providerId : null,
      supportedCategories: [], grantedCategories: [] };
    case "share": {
      if (!categories.includes(action.category)) return state;
      if (action.enabled && state.supportedCategories.length && !state.supportedCategories.includes(action.category)) return state;
      return { ...changed, sharedData: { ...state.sharedData, [action.category]: action.enabled },
        observations: action.enabled ? state.observations : state.observations.filter(item => item.category !== action.category),
        status: state.status === "syncing" ? "connected" : state.status };
    }
    case "disconnect": return { ...changed, enabled: false, sessionVerified: false, providerId: null, status: "not_connected", supportedCategories: [], grantedCategories: [] };
    case "delete_data": return { ...changed, observations: [], lastSyncedAt: null, status: state.status === "syncing" ? "connected" : state.status };
  }
  if (!state.enabled || action.revision !== state.revision) return state;
  if (action.type === "verified") {
    if (!providers.some(p => p.id === action.providerId) || !action.session.connected) return { ...state, sessionVerified: false, status: "needs_attention" };
    const supported = categoryList(action.session.supportedCategories);
    return { ...state, sessionVerified: true, providerId: action.providerId, status: "connected", supportedCategories: supported,
      grantedCategories: categoryList(action.session.grantedCategories).filter(c => supported.includes(c)) };
  }
  if (action.type === "attention") return { ...state, status: "needs_attention" };
  if (!providers.some(p => p.id === state.providerId) || !["connected", "syncing"].includes(state.status)) return state;
  if (action.type === "syncing") return { ...state, status: "syncing" };
  if (action.providerId !== state.providerId || !validDate(action.at)) return state;
  const accepted = action.observations.filter(item => validObservation(item) && item.providerId === state.providerId &&
    state.sharedData[item.category] && state.supportedCategories.includes(item.category) && state.grantedCategories.includes(item.category));
  const deduplicated = new Map(state.observations.map(item => [`${item.providerId}:${item.id}`, item]));
  accepted.forEach(item => deduplicated.set(`${item.providerId}:${item.id}`, item));
  return { ...state, status: "connected", lastSyncedAt: action.at, observations: [...deduplicated.values()] };
}
export function wearableStatusLabel(status: WearableStatus): string {
  return { not_connected: "Not connected", connecting: "Connecting", connected: "Connected", syncing: "Syncing", needs_attention: "Connection needs attention" }[status];
}
/** Optional supporting observations only. This module cannot mutate profile, target, constraints or scoring. */
export function wearableSupportingEvidence(state: WearableConnection): WearableObservation[] {
  if (!state.enabled || !["connected", "syncing"].includes(state.status)) return [];
  return state.observations.filter(item => item.quality === "usable" && item.providerId === state.providerId &&
    state.sharedData[item.category] && state.supportedCategories.includes(item.category) && state.grantedCategories.includes(item.category));
}

/** Display privileges require a live verified session with a configured adapter, never an opt-in. */
export function wearablePresentation(state: WearableConnection, providers: readonly WearableProvider[] = WEARABLE_PROVIDERS) {
  const provider = providers.find(item => item.id === state.providerId);
  const connected = Boolean(provider && state.enabled && state.sessionVerified &&
    ["connected", "syncing", "needs_attention"].includes(state.status));
  const status: WearableStatus | "disconnected_with_data" = connected ? state.status : provider && state.enabled && ["connecting", "needs_attention"].includes(state.status)
    ? state.status : state.observations.length ? "disconnected_with_data" : "not_connected";
  return { provider, connected, status, hasImportedData: state.observations.length > 0 };
}
