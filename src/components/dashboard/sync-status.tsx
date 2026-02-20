"use client";

import { useState, useRef, useEffect } from "react";

export interface SyncData {
  status: string;
  lastSyncAt?: { toDate?: () => Date } | string | null;
  lastError?: string | null;
  itemsSynced?: number;
  [key: string]: unknown;
}

interface LogLine {
  time: string;
  text: string;
  type: "info" | "success" | "error" | "dim";
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export function SyncStatusPanel({
  snuggpro,
  companycam,
}: {
  snuggpro: SyncData | null;
  companycam: SyncData | null;
}) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: LogLine["type"] = "info") => {
    setLogs((prev) => [...prev, { time: timestamp(), text, type }]);
  };

  const triggerSnuggProSync = async () => {
    setSyncing("snuggpro");
    setShowTerminal(true);
    addLog("Starting SnuggPro sync...", "info");

    const start = performance.now();

    try {
      const res = await fetch("/api/integrations/snuggpro/sync", { method: "POST" });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        addLog(`Sync failed: ${err.error || res.statusText}`, "error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;

          try {
            const data = JSON.parse(match[1]);

            if (data.type === "status") {
              addLog(data.message, "info");
            } else if (data.type === "progress") {
              const pct = data.percent;
              const bar = `[${"=".repeat(Math.floor(pct / 5))}${" ".repeat(20 - Math.floor(pct / 5))}]`;
              // Show addresses synced in this batch
              for (const addr of (data.batch || [])) {
                addLog(`  synced: ${addr}`, "dim");
              }
              addLog(`${bar} ${pct}%  ${data.synced}/${data.total} synced, ${data.errCount} errors`, "info");
            } else if (data.type === "detail_warnings") {
              for (const w of (data.warnings || [])) {
                addLog(`  ⚠ ${w}`, "dim");
              }
            } else if (data.type === "done") {
              const elapsed = ((performance.now() - start) / 1000).toFixed(1);
              addLog(`${data.jobsSynced} jobs synced to Firestore`, "success");
              if (data.errorCount > 0) {
                addLog(`${data.errorCount} errors:`, "error");
                for (const err of (data.errors || []).slice(0, 10)) {
                  addLog(`  ${err}`, "error");
                }
                if (data.errorCount > 10) {
                  addLog(`  ...and ${data.errorCount - 10} more`, "error");
                }
              }
              addLog(`Done in ${elapsed}s`, "success");
            } else if (data.type === "error") {
              addLog(`Error: ${data.message}`, "error");
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err) {
      addLog(`Network error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      addLog("", "dim");
      setSyncing(null);
    }
  };

  const triggerCompanyCamSync = async () => {
    setSyncing("companycam");
    setShowTerminal(true);
    addLog("Starting CompanyCam sync...", "info");

    const start = performance.now();

    try {
      const res = await fetch("/api/integrations/companycam/sync", { method: "POST" });
      const elapsed = ((performance.now() - start) / 1000).toFixed(1);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        addLog(`Sync failed: ${err.error || res.statusText}`, "error");
        return;
      }

      const data = await res.json();
      addLog(`${data.projectsMatched ?? 0} projects matched to jobs`, "success");
      addLog(`${data.photosImported ?? 0} photos imported`, "success");
      if (data.unmatched?.length > 0) {
        addLog(`${data.unmatched.length} unmatched projects:`, "dim");
        for (const addr of data.unmatched.slice(0, 10)) {
          addLog(`  ${addr}`, "dim");
        }
      }
      if (data.errors?.length > 0) {
        addLog(`${data.errors.length} errors:`, "error");
        for (const err of data.errors.slice(0, 10)) {
          addLog(`  ${err}`, "error");
        }
      }
      addLog(`Done in ${elapsed}s`, "success");
    } catch (err) {
      addLog(`Network error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      addLog("", "dim");
      setSyncing(null);
    }
  };

  const triggerSync = (provider: "snuggpro" | "companycam") => {
    if (provider === "snuggpro") triggerSnuggProSync();
    else triggerCompanyCamSync();
  };

  const formatTime = (ts: SyncData["lastSyncAt"]) => {
    if (!ts) return "Never";
    if (typeof ts === "string") return new Date(ts).toLocaleString();
    const date = ts.toDate ? ts.toDate() : new Date();
    return date.toLocaleString();
  };

  const clearLogs = () => {
    setLogs([]);
    setShowTerminal(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h2>

      <div className="space-y-4">
        <SyncRow
          name="SnuggPro"
          status={snuggpro?.status || "idle"}
          lastSync={formatTime(snuggpro?.lastSyncAt)}
          itemsSynced={snuggpro?.itemsSynced || 0}
          error={snuggpro?.lastError}
          onSync={() => triggerSync("snuggpro")}
          loading={syncing === "snuggpro"}
          disabled={syncing !== null}
        />
        <SyncRow
          name="CompanyCam"
          status={companycam?.status || "idle"}
          lastSync={formatTime(companycam?.lastSyncAt)}
          itemsSynced={companycam?.itemsSynced || 0}
          error={companycam?.lastError}
          onSync={() => triggerSync("companycam")}
          loading={syncing === "companycam"}
          disabled={syncing !== null}
        />
      </div>

      {/* Terminal output */}
      {showTerminal && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Sync Log</span>
            <button
              onClick={clearLogs}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          <div
            ref={terminalRef}
            className="bg-gray-950 rounded-lg p-4 font-mono text-xs leading-5 max-h-64 overflow-y-auto"
          >
            {logs.map((line, i) => {
              if (!line.text) return <div key={i} className="h-2" />;
              const color =
                line.type === "success"
                  ? "text-green-400"
                  : line.type === "error"
                  ? "text-red-400"
                  : line.type === "dim"
                  ? "text-gray-500"
                  : "text-gray-300";
              return (
                <div key={i} className={color}>
                  <span className="text-gray-600 select-none">{line.time}</span>{" "}
                  {line.text}
                </div>
              );
            })}
            {syncing && (
              <div className="text-yellow-400 animate-pulse">
                <span className="text-gray-600 select-none">{timestamp()}</span>{" "}
                Syncing...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SyncRow({
  name,
  status,
  lastSync,
  itemsSynced,
  error,
  onSync,
  loading,
  disabled,
}: {
  name: string;
  status: string;
  lastSync: string;
  itemsSynced: number;
  error?: string | null;
  onSync: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const statusColor =
    status === "error"
      ? "bg-red-100 text-red-800"
      : status === "syncing"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-800";

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Last sync: {lastSync} · {itemsSynced} items
        </p>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
      <button
        onClick={onSync}
        disabled={disabled}
        className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Syncing..." : "Sync"}
      </button>
    </div>
  );
}
