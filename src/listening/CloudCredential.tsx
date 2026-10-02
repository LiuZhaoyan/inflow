"use client";

import { useState } from 'react';

export default function CloudCredential() {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save() {
    setBusy(true); setMessage('');
    try { await window.inflow!.configureCredential(key); setKey(''); setMessage('Key saved on this device.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the key.'); }
    finally { setBusy(false); }
  }
  return <details className="cloud-credential"><summary>Cloud API key</summary>
    <label>DeepSeek API key<input type="password" value={key} maxLength={512} autoComplete="off" disabled={busy}
      onChange={event => setKey(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (key && !busy) void save(); } }}/></label>
    <button type="button" disabled={!key || busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save key'}</button>
    {message && <p role="status">{message}</p>}
  </details>;
}
