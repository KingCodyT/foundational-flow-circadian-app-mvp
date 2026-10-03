"use client";

import { useState } from "react";
import { useCircadian } from "./circadian-provider";
import { WEARABLE_CATEGORIES, WEARABLE_PROVIDERS, wearablePresentation, wearableStatusLabel,
  type WearableCategory, type WearableConnection, type WearableProvider, type WearableAction } from "@/lib/wearables/connection";

export function WearableSettings() {
  const { wearableConnection, updateWearables, dailyProfile } = useCircadian();
  return <WearableSettingsPanel connection={wearableConnection} update={updateWearables} timeZone={dailyProfile?.timeZone} />;
}

// Separate presentation permits state-matrix tests without registering test providers in the app.
export function WearableSettingsPanel({ connection, update, timeZone, providers = WEARABLE_PROVIDERS }: {
  connection: WearableConnection; update: (action: WearableAction) => void;
  timeZone?: string | null; providers?: readonly WearableProvider[];
}) {
  const [selecting, setSelecting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const view = wearablePresentation(connection, providers);
  const connecting = view.status === "connecting";
  async function connect(provider: WearableProvider) {
    update({ type: "connecting", providerId: provider.id });
    setSelecting(false);
    setMessage("");
    try {
      const session = await provider.connect([]);
      update({ type: "verified", providerId: provider.id, session, revision: connection.revision + 1 });
    } catch { update({ type: "attention", revision: connection.revision + 1 }); }
  }
  async function manage(action: "disconnect" | "delete_data" | "share", category?: WearableCategory, enabled?: boolean) {
    if (!view.connected || !view.provider) return;
    setBusy(true); setMessage("");
    try {
      if (action === "disconnect") {
        await view.provider.disconnect(); update({ type: "disconnect" });
      } else if (action === "delete_data") {
        await view.provider.deleteImportedData(); update({ type: "delete_data" });
        setMessage("Imported wearable data deleted from this app.");
      } else if (category) {
        const selected = Object.keys(WEARABLE_CATEGORIES).filter(key => key === category ? enabled : connection.sharedData[key as WearableCategory]) as WearableCategory[];
        const session = await view.provider.chooseSharedData(selected);
        update({ type: "share", category, enabled: Boolean(enabled) });
        update({ type: "verified", providerId: view.provider.id, session, revision: connection.revision + 1 });
      }
    } catch { update({ type: "attention", revision: connection.revision }); setMessage("The connection needs attention. Your request could not be completed. Please try again."); }
    finally { setBusy(false); }
  }
  return <section id="connections" aria-labelledby="connections-heading" className="mt-6 rounded-3xl border border-[var(--color-line)] bg-white/70 p-6 sm:p-8">
    <h2 id="connections-heading" className="text-2xl font-semibold">Connections</h2>
    <section id="wearables" aria-labelledby="wearables-heading" className="mt-6">
      <h3 id="wearables-heading" className="text-xs font-semibold uppercase tracking-[0.22em]">Wearables</h3>
      <p className="mt-3">Optional · {view.status === "not_connected" || view.status === "disconnected_with_data" ? "Not connected" : wearableStatusLabel(view.status)}</p>
      <details className="profile-disclosure"><summary>Manage wearables</summary>
      <p className="mt-3">Connect a supported wearable to share optional sleep, activity, and timing information.</p>
      <p className="mt-3">Foundational Flow works fully without a wearable.</p>
      <p role="status" className="mt-5 font-semibold">{view.status === "not_connected" || view.status === "disconnected_with_data" ? "NO WEARABLE CONNECTED" : wearableStatusLabel(view.status)}</p>
      {!view.connected && <>
        {view.status === "disconnected_with_data" && <p className="mt-3">Previously imported wearable data is retained in this app. No wearable is connected and no new data is being imported.</p>}
        {view.status === "needs_attention" && <p className="mt-3">The connection could not be verified. Try connecting again.</p>}
        <button className="journey-outline mt-4" disabled={connecting} aria-expanded={selecting} aria-controls="wearable-providers" onClick={() => setSelecting(!selecting)}>{connecting ? "Connecting…" : "Connect a wearable"}</button>
        {selecting && <div id="wearable-providers" role="region" aria-label="Wearable providers" className="mt-4 space-y-3">
          <h4 className="font-semibold">{providers.length ? "Choose a provider" : "Wearable connections are coming soon"}</h4>
          {providers.length ? providers.map(provider => <button key={provider.id} className="journey-outline" onClick={() => void connect(provider)}>Connect {provider.name}</button>) :
            <p>No provider integrations are configured in this version. You cannot connect a device yet. Foundational Flow works fully without a wearable.</p>}
          <button className="journey-outline" onClick={() => setSelecting(false)}>Close</button>
        </div>}
      </>}
      {view.connected && <div className="mt-5 space-y-4">
        <p>{view.provider?.name}</p>
        {connection.lastSyncedAt && <p>Last synced {new Intl.DateTimeFormat("en-US", { timeZone: timeZone || undefined, dateStyle: "medium", timeStyle: "short" }).format(new Date(connection.lastSyncedAt))}</p>}
        <details><summary className="cursor-pointer font-semibold">Manage connection</summary>
          <p className="mt-3">Phone notification permissions are managed separately in Your schedule.</p>
        </details>
        <details><summary className="cursor-pointer font-semibold">Choose shared data</summary>
          <p className="mt-3 text-sm">Only categories supported and authorized by your provider can be imported.</p>
          <fieldset disabled={busy} className="mt-3 space-y-3"><legend className="sr-only">Wearable data sharing preferences</legend>
            {(Object.entries(WEARABLE_CATEGORIES) as [WearableCategory, string][]).map(([category, label]) => {
              const unsupported = !connection.supportedCategories.includes(category);
              return <label key={category} className="flex items-center gap-3"><input type="checkbox" checked={connection.sharedData[category]} disabled={unsupported} onChange={event => void manage("share", category, event.target.checked)}/><span>{label}{unsupported ? " — Not supported by this connection" : ""}</span></label>;
            })}
          </fieldset>
          <p className="mt-3 text-sm">Turning a category off stops its use and removes its imported records from this app.</p>
        </details>
        <button className="journey-outline" disabled={busy} onClick={() => void manage("disconnect")}>Disconnect wearable</button>
        {view.hasImportedData && <div>
          <button className="journey-outline" disabled={busy} onClick={() => void manage("delete_data")}>Delete imported wearable data</button>
          <p className="mt-3 text-sm">Deleting app imports does not delete data held by the wearable provider.</p>
        </div>}
      </div>}
      {message && <p className="mt-3" role="status">{message}</p>}
      </details>
    </section>
  </section>;
}
