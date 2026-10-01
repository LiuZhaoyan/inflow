"use client";

import { useEffect, useRef, useState } from 'react';
import type { ArtifactVocabularySource, CredentialStatus, LearningArtifact, VocabularyEntry } from './desktop';
import type { VocabularyDraft } from './VocabularyNotebook';

export default function ArtifactLibrary({ selected, source, onCollect }: {
  selected: VocabularyEntry[]; source: ArtifactVocabularySource | null; onCollect: (draft: VocabularyDraft) => void;
}) {
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  const [artifact, setArtifact] = useState<LearningArtifact | null>(null);
  const [credential, setCredential] = useState<CredentialStatus>({ configured: false });
  const [key, setKey] = useState('');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [error, setError] = useState('');
  const [translation, setTranslation] = useState(false);
  const job = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([window.inflow!.listArtifacts(), window.inflow!.restoreArtifact(), window.inflow!.credentialStatus()])
      .then(([items, restored, status]) => { if (active) { setArtifacts(items); setArtifact(restored); setCredential(status); } })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '短文读取失败。'); });
    return () => { active = false; if (job.current) void window.inflow!.cancel(job.current).catch(() => {}); };
  }, []);
  useEffect(() => {
    if (!source) return;
    let active = true;
    window.inflow!.openArtifact(source.artifactId).then(next => {
      if (active) { setArtifact(next); setTranslation(false); setError(''); }
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '来源短文无法打开。'); });
    return () => { active = false; };
  }, [source]);
  useEffect(() => {
    if (source && source.artifactId === artifact?.id) document.getElementById(`artifact-sentence-${source.sentenceIndex}`)?.scrollIntoView({ block: 'center' });
  }, [source, artifact]);

  async function configure(event: React.FormEvent) {
    event.preventDefault(); setConfiguring(true); setError('');
    try { setCredential(await window.inflow!.configureCredential(key)); setKey(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '密钥保存失败。'); }
    finally { setConfiguring(false); }
  }
  async function generate() {
    setBusy(true); setError('');
    const id = crypto.randomUUID(); job.current = id;
    try {
      const next = await window.inflow!.generateArtifact(selected.map(entry => entry.id), topic, id);
      setArtifacts(items => [next, ...items]); setArtifact(next); setTranslation(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : '生成失败，请重试。'); }
    finally { job.current = null; setBusy(false); }
  }
  async function open(id: string) {
    try { setArtifact(await window.inflow!.openArtifact(id)); setTranslation(false); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '短文无法打开。'); }
  }
  function collect(sentenceIndex: number) {
    const selection = window.getSelection();
    const text = document.getElementById(`artifact-sentence-${sentenceIndex}`);
    const surface = selection?.toString().trim();
    if (!artifact || !surface || surface.length > 100 || !text?.contains(selection!.anchorNode) || !text.contains(selection!.focusNode)) {
      setError('请在这句韩语短文中选中要收藏的词语（100 字以内）。'); return;
    }
    const sentence = artifact.sentences[sentenceIndex].parts.map(part => part.text).join('');
    if (!sentence.replace(/\s+/gu, ' ').includes(surface.replace(/\s+/gu, ' '))) { setError('选中文字不属于这一句，请重新选择。'); return; }
    setError('');
    onCollect({ key: crypto.randomUUID(), lemma: surface, meaningZh: '', source: {
      reference: { artifactId: artifact.id, sentenceIndex, surface }, surface, sentence, sourceName: artifact.title,
    } });
  }

  return <section className="vocabulary-notebook artifact-library" id="artifacts" aria-label="学习短文">
    <h2>学习短文</h2>
    <p className="processing-note">使用词汇本选中的词汇生成一篇韩语短文。生成内容可能有误，请结合语境判断。</p>
    <details className="generation-credential" open={!credential.configured || !!credential.error}><summary>{credential.configured ? 'DeepSeek 密钥已配置 · 更换密钥' : '配置 DeepSeek API key'}</summary>
      <form onSubmit={event => void configure(event)}><label>DeepSeek API key<input type="password" name="apiKey" value={key} autoComplete="off" maxLength={512} required onChange={event => setKey(event.target.value)}/></label><button type="submit" className="process-button" disabled={configuring || busy}>{configuring ? '正在保存…' : '保存密钥'}</button></form>
      <p className="processing-note">密钥由 Windows 加密保存在本机。生成时只发送所选词汇、原句和主题。</p>{credential.error && <p role="alert">{credential.error}</p>}
    </details>
    <div className="artifact-generation"><label>主题（可选）<input name="topic" value={topic} maxLength={200} disabled={busy} onChange={event => setTopic(event.target.value)}/></label>
      <button className="process-button" disabled={busy || configuring || !credential.configured || !selected.length} onClick={() => void generate()}>{busy ? '正在生成…' : error ? '重试生成短文' : `用 ${selected.length} 个词汇生成短文`}</button>
      {busy && <button className="process-button" onClick={() => { if (job.current) void window.inflow!.cancel(job.current).catch(() => setError('取消失败，请重试。')); }}>取消生成</button>}
    </div>
    {error && <p className="notice" role="alert">{error}</p>}
    {!!artifacts.length && <label className="artifact-selector">已保存的短文<select aria-label="已保存的短文" value={artifact?.id ?? ''} onChange={event => void open(event.target.value)}>{!artifact && <option value="">选择短文</option>}{artifacts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    {artifact ? <article className="artifact-reader" data-artifact-id={artifact.id}>
      <h3 lang="ko">{artifact.title}</h3><p className="processing-note">{new Date(artifact.createdAt).toLocaleDateString()}{artifact.topic && ` · 主题：${artifact.topic}`}</p>
      <details className="artifact-targets"><summary>生成时的目标词汇 · {artifact.targets.length} 个</summary><ul>{artifact.targets.map(target => <li key={target.id}><span lang="ko">{target.lemma}</span>：{target.meaningZh}</li>)}</ul></details>
      {artifact.sentences.map((sentence, index) => <div className="artifact-sentence" key={index}>
        <p className="artifact-korean" id={`artifact-sentence-${index}`} lang="ko">{sentence.parts.map((part, n) => part.targetId ? <mark key={n} title={artifact.targets.find(target => target.id === part.targetId)?.meaningZh}>{part.text}</mark> : <span key={n}>{part.text}</span>)}</p>
        {translation && <p className="artifact-translation" lang="zh">{sentence.translationZh}</p>}
        <button className="vocabulary-source" onMouseDown={event => event.preventDefault()} onClick={() => collect(index)}>收藏这句中的选词</button>
      </div>)}
      <button className="process-button" aria-expanded={translation} onClick={() => setTranslation(value => !value)}>{translation ? '隐藏短文翻译' : '显示短文翻译'}</button>
    </article> : <p className="processing-note">选择词汇后即可生成；保存的短文可离线重读。</p>}
  </section>;
}
