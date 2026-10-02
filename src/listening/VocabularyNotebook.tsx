"use client";

import { useEffect, useState } from 'react';
import type { SaveVocabularyInput, VocabularyEntry, MediaVocabularySource } from './desktop';

export type VocabularyDraft = {
  key: string; id?: string; lemma: string; meaningZh: string;
  context?: SaveVocabularyInput['context'];
};

function VocabularyEditor({ draft, busy, active, onSave, onCancel }: {
  draft: VocabularyDraft; busy: boolean; active: boolean; onSave: (input: SaveVocabularyInput) => Promise<void>; onCancel: () => void;
}) {
  const [lemma, setLemma] = useState(draft.lemma);
  const [meaning, setMeaning] = useState(draft.meaningZh);
  const [error, setError] = useState('');
  return <form className="vocabulary-editor" aria-label="词汇审阅" onSubmit={event => {
    event.preventDefault(); setError('');
    void onSave({ id: draft.id, lemma, meaningZh: meaning, context: draft.context })
      .catch(failure => setError(failure instanceof Error ? failure.message : '保存失败，请重试。'));
  }}>
    <h3>{draft.id ? '修正词汇' : draft.context ? '确认收藏词汇' : '手动添加词汇'}</h3>
    {draft.context ? <div className="vocabulary-context"><p>遇到的形式：<strong lang="ko">{draft.context.surface}</strong></p><p lang="ko">{draft.context.sentence}</p><small>来源：{draft.context.source.name}</small></div> : !draft.id && <p>手动添加的词汇没有原句来源。</p>}
    <fieldset disabled={busy}>
      <label>韩语词典形<input autoFocus={active} name="lemma" value={lemma} maxLength={100} required onChange={event => setLemma(event.target.value)}/></label>
      <label>当前语境的中文词义<input name="meaningZh" value={meaning} maxLength={300} required onChange={event => setMeaning(event.target.value)}/></label>
      <p className="processing-note">请确认词典形和此处的意思。同词同义会追加来源，不同词义会分别保存。</p>
      <div className="vocabulary-actions"><button className="primary" type="submit">{busy ? '正在保存…' : '保存词汇'}</button><button type="button" onClick={onCancel}>取消</button></div>
    </fieldset>
    {error && <p className="notice" role="alert">{error}</p>}
  </form>;
}

export default function VocabularyNotebook({ collection, onDismiss, onOpenSource, onEditingChange, active = true }: {
  collection: VocabularyDraft | null; onDismiss: () => void; onOpenSource: (source: MediaVocabularySource) => void;
  onEditingChange?: (editing: boolean) => void; active?: boolean;
}) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [editing, setEditing] = useState<VocabularyDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const draft = editing || collection;
  const hasPendingEdit = Boolean(draft) || busy;
  useEffect(() => {
    let active = true;
    window.inflow!.listVocabulary().then(result => { if (active) { setEntries(result); setLoaded(true); } })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '词汇本读取失败。'); });
    return () => { active = false; };
  }, []);

  useEffect(() => { onEditingChange?.(hasPendingEdit); }, [hasPendingEdit, onEditingChange]);
  useEffect(() => {
    if (active && draft) document.querySelector<HTMLInputElement>('#notebook input[name="lemma"]')?.focus();
  }, [active, draft]);

  function dismiss() { onDismiss(); setEditing(null); }
  async function save(input: SaveVocabularyInput) {
    setBusy(true); setError('');
    try { await window.inflow!.saveVocabulary(input); setEntries(await window.inflow!.listVocabulary()); dismiss(); }
    finally { setBusy(false); }
  }
  return <><section className="vocabulary-notebook" id="notebook" aria-label="词汇本">
    <div className="vocabulary-heading"><h2>词汇本</h2><button className="process-button" disabled={hasPendingEdit} onClick={() => { onDismiss(); setEditing({ key: crypto.randomUUID(), lemma: '', meaningZh: '' }); }}>手动添加</button></div>
    {draft && <VocabularyEditor key={draft.key} draft={draft} busy={busy} active={active} onSave={save} onCancel={dismiss}/>}
    {error && <p className="notice" role="alert">{error}</p>}
    {!entries.length && <p className="processing-note">{loaded ? '从已揭晓的原文选中文字，再收藏到这里；也可以手动添加。' : '正在读取词汇本…'}</p>}
    <div className="vocabulary-list">{entries.map(entry => <article className="vocabulary-entry" key={entry.id} data-entry-id={entry.id}>
      <div className="vocabulary-heading"><strong lang="ko">{entry.lemma}</strong><button disabled={hasPendingEdit} onClick={() => { onDismiss(); setEditing({ key: crypto.randomUUID(), id: entry.id, lemma: entry.lemma, meaningZh: entry.meaningZh }); }}>修正</button></div>
      <p>{entry.meaningZh}</p>
      {entry.contexts.length ? <details><summary>来源 · {entry.contexts.length} 处</summary>{entry.contexts.map(({ id, surface, sentence, source }) => <div className="vocabulary-context" key={id}>
        <p>遇到的形式：<span lang="ko">{surface}</span></p><p lang="ko">{sentence}</p>
        {source.type === 'artifact' ? <small>短文：{source.name} · 第 {source.sentenceIndex + 1} 句</small> : <button className="vocabulary-source" onClick={() => onOpenSource(source)}>{source.name} · {Math.floor(source.start / 60)}:{String(Math.floor(source.start % 60)).padStart(2, '0')} ↗</button>}
      </div>)}</details> : <small>手动添加 · 无原句来源</small>}
    </article>)}</div>
  </section></>;
}
