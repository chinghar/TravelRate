'use client';

import { useRef, useState } from 'react';
import { exportAllData, importAllData, type ExportPayload } from '@/lib/db';

function isExportPayload(data: unknown): data is ExportPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.visits) && Array.isArray(d.wishlist);
}

export default function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cityrank-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Exported.');
  }

  async function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isExportPayload(parsed)) {
        setMessage('That file is not a valid CityRank export.');
        return;
      }
      await importAllData(parsed);
      setMessage('Imported. Reloading…');
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setMessage('Could not read that file.');
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-sm flex-col gap-4 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-stone-500">Backup & sharing</h3>
          <p className="text-sm text-stone-600">
            All your data lives only in this browser. Export a JSON backup to
            keep it safe or move it to another device, then import it there.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
          {message && <p className="text-sm text-stone-500">{message}</p>}
          <p className="text-xs text-stone-400">
            Importing replaces everything currently stored in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
