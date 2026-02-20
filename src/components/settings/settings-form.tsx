"use client";

import { useState } from "react";

interface SettingsData {
  name: string;
  snuggproBaseUrl: string;
  syncInterval: number;
  hasSnuggpro: boolean;
  hasCompanycam: boolean;
}

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const [name, setName] = useState(initial.name);
  const [syncInterval, setSyncInterval] = useState(initial.syncInterval);
  const [snuggproPublicKey, setSnuggproPublicKey] = useState("");
  const [snuggproPrivateKey, setSnuggproPrivateKey] = useState("");
  const [snuggproBaseUrl, setSnuggproBaseUrl] = useState(initial.snuggproBaseUrl);
  const [companycamToken, setCompanycamToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const testConnection = async (provider: "snuggpro" | "companycam") => {
    setTesting(provider);
    setMessage(null);

    const body =
      provider === "snuggpro"
        ? { publicKey: snuggproPublicKey, privateKey: snuggproPrivateKey, baseUrl: snuggproBaseUrl }
        : { token: companycamToken };

    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `${provider === "snuggpro" ? "SnuggPro" : "CompanyCam"} connected successfully!` });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Connection failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection failed" });
    } finally {
      setTesting(null);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, syncInterval }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SnuggPro */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">SnuggPro</h2>
        <p className="text-sm text-gray-500 mb-4">
          {initial.hasSnuggpro ? "Connected" : "Not connected"} — Enter your API keys to sync energy data.
          Find them in SnuggPro under Settings &gt; Your Companies &gt; App Integrations.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
            <input
              type="text"
              value={snuggproPublicKey}
              onChange={(e) => setSnuggproPublicKey(e.target.value)}
              placeholder={initial.hasSnuggpro ? "••••••••" : "Enter public key"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Key</label>
            <input
              type="password"
              value={snuggproPrivateKey}
              onChange={(e) => setSnuggproPrivateKey(e.target.value)}
              placeholder={initial.hasSnuggpro ? "••••••••" : "Enter private key"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              type="text"
              value={snuggproBaseUrl}
              onChange={(e) => setSnuggproBaseUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => testConnection("snuggpro")}
            disabled={!snuggproPublicKey || !snuggproPrivateKey || testing === "snuggpro"}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing === "snuggpro" ? "Testing..." : "Test Connection & Save"}
          </button>
        </div>
      </section>

      {/* CompanyCam */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">CompanyCam</h2>
        <p className="text-sm text-gray-500 mb-4">
          {initial.hasCompanycam ? "Connected" : "Not connected"} — Enter your bearer token to sync photos
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token</label>
            <input
              type="password"
              value={companycamToken}
              onChange={(e) => setCompanycamToken(e.target.value)}
              placeholder={initial.hasCompanycam ? "••••••••" : "Enter token"}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => testConnection("companycam")}
            disabled={!companycamToken || testing === "companycam"}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing === "companycam" ? "Testing..." : "Test Connection & Save"}
          </button>
        </div>
      </section>

      {/* General */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              min={5}
              value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value, 10) || 60)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </section>
    </div>
  );
}
