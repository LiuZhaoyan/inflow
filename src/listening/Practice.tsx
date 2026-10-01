"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import RevealMenu from './RevealMenu';
import { revealedGroupCount, type RevealChoice } from './reveal';
import { validateSegments, type Segment } from './processing';
import { managedMediaUrl, type SavedMedia, type MediaVocabularySource } from './desktop';
import VocabularyNotebook, { type VocabularyDraft } from './VocabularyNotebook';

const clock = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function Practice() {
  const media = useRef<HTMLMediaElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const processing = useRef<AbortController | null>(null);
  const translating = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | { name: string; type: string } | null>(null);
  const [savedMedia, setSavedMedia] = useState<SavedMedia | null>(null);
  const [library, setLibrary] = useState<SavedMedia[]>([]);
  const [desktop, setDesktop] = useState(false);
  const [collection, setCollection] = useState<VocabularyDraft | null>(null);
  const [collectionError, setCollectionError] = useState('');
  const transcript = useRef<HTMLParagraphElement>(null);
  const [src, setSrc] = useState('');
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<RevealChoice | null>(null);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const segment = segments[index];
  const video = !!file && (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name));
  const selectReveal = useCallback((choice: RevealChoice) => setReveal(choice), []);
  const hideText = useCallback(() => {
    setCollectionError('');
    setReveal(null); setTranslationOpen(false); setTranslation(''); setTranslationError(''); setTranslationBusy(false);
    translating.current?.abort();
  }, []);
  const applySaved = useCallback((next: SavedMedia) => {
    processing.current?.abort(); translating.current?.abort(); media.current?.pause();
    setSavedMedia(next); setFile({ name: next.name, type: next.video ? 'video/' : 'audio/' });
    setSrc(next.missing ? '' : managedMediaUrl(next.id));
    setDuration(next.learning.duration); setPosition(next.learning.position); setIndex(next.learning.index);
    setRate(next.learning.rate); setLoop(next.learning.loop); setSegments(next.segments);
    setPlaying(false); setBusy(false); hideText();
    setError(next.missing ? '媒体文件丢失。原文和学习记录仍然保留，请重新关联同一文件。' : '');
  }, [hideText]);

  useEffect(() => () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { processing.current?.abort(); translating.current?.abort(); }, []);
  useEffect(() => {
    const desktop = window.inflow;
    if (!desktop) return;
    let active = true;
    Promise.all([desktop.restore(), desktop.list()]).then(([restored, items]) => {
      if (!active) return;
      setDesktop(true);
      setLibrary(items);
      if (restored) applySaved(restored);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '素材恢复失败，请重试。'); });
    return () => { active = false; };
  }, [applySaved]);
  useEffect(() => {
    if (!savedMedia || !duration) return;
    void window.inflow?.saveLearning(savedMedia.id, { position, index, rate, loop, duration }).catch(failure => setError(failure instanceof Error ? failure.message : '学习记录保存失败。'));
  }, [savedMedia, duration, position, index, rate, loop]);
  useEffect(() => {
    if (!playing || !segment) return;
    let frame = 0;
    const tick = () => {
      const el = media.current;
      if (el && !el.paused) {
        if (el.currentTime < segment.start) el.currentTime = segment.start;
        if (el.currentTime >= segment.end) {
          if (loop) el.currentTime = segment.start;
          else { el.pause(); el.currentTime = segment.end; }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, segment, loop]);

  async function importMedia() {
    if (!window.inflow) { picker.current?.click(); return; }
    try {
      const next = await window.inflow.importMedia();
      if (next) { applySaved(next); setLibrary(await window.inflow.list()); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '导入失败，请重试。'); }
  }

  async function openSaved(id: string, relink = false) {
    try {
      const next = relink ? await window.inflow!.relink(id) : await window.inflow!.open(id);
      if (next) { applySaved(next); setLibrary(await window.inflow!.list()); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '素材打开失败，请重试。'); }
  }

  function desktopJob(controller: AbortController) {
    const job = crypto.randomUUID();
    controller.signal.addEventListener('abort', () => { void window.inflow?.cancel(job).catch(() => {}); }, { once: true });
    return job;
  }

  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (!next.size || next.size > 50 * 1024 * 1024 || (!/^(audio|video)\//.test(next.type) && !/\.(mp3|mp4|wav|m4a|ogg|webm|mov|flac|aac)$/i.test(next.name))) {
      setError('请选择 50 MB 以内的音频或视频文件。'); return;
    }
    processing.current?.abort(); translating.current?.abort(); media.current?.pause();
    setFile(next); setSrc(URL.createObjectURL(next)); setDuration(0); setPosition(0); setPlaying(false);
    setSegments([]); setIndex(0); setBusy(false); setError(''); setLoop(false); hideText();
  }

  function select(next: number) {
    if (!segments[next]) return;
    media.current?.pause(); setIndex(next); hideText();
    if (media.current) media.current.currentTime = segments[next].start;
    setPosition(segments[next].start);
  }

  function collectSelection() {
    const selection = window.getSelection();
    const surface = selection?.toString().trim();
    const source = savedMedia?.segments[index];
    if (!source || !selection?.rangeCount || !surface || surface.length > 100 ||
      !transcript.current?.contains(selection.anchorNode) || !transcript.current.contains(selection.focusNode) ||
      selection.getRangeAt(0).cloneContents().querySelector('.hidden-group') ||
      !source.text.replace(/\s+/gu, ' ').includes(surface.replace(/\s+/gu, ' '))) {
      setCollectionError('请在已揭晓的当前句原文中选中要收藏的词语（100 字以内）。'); return;
    }
    setCollectionError('');
    setCollection({ key: crypto.randomUUID(), lemma: surface, meaningZh: '', source: { reference: { segmentId: source.id, surface }, surface, sentence: source.text, sourceName: savedMedia!.name } });
    document.getElementById('notebook')?.scrollIntoView({ block: 'start' });
  }

  async function openVocabularySource(source: MediaVocabularySource) {
    try {
      const saved = await window.inflow!.open(source.mediaId);
      let next = saved.segments.findIndex(item => item.id === source.segmentId);
      const historical = next < 0;
      if (historical) {
        next = saved.segments.findIndex(item => item.end > source.start);
        if (next < 0) next = Math.max(0, saved.segments.length - 1);
      }
      const position = saved.segments[next]?.start ?? source.start;
      applySaved({ ...saved, learning: { ...saved.learning, index: next, position } });
      if (media.current && saved.id === savedMedia?.id && !saved.missing) media.current.currentTime = position;
      document.getElementById('practice')?.scrollIntoView({ block: 'start' });
      if (historical && !saved.missing) setError('素材已重新转写，已打开相近位置。收藏时的原句仍保留在词汇本。');
    } catch (failure) { setError(failure instanceof Error ? failure.message : '来源素材无法打开。'); }
  }

  async function play() {
    const el = media.current;
    if (!el) return;
    if (!el.paused) { el.pause(); return; }
    if (segment && (el.currentTime < segment.start || el.currentTime >= segment.end - 0.02)) el.currentTime = segment.start;
    try { await el.play(); } catch { setError('播放未能开始，请再次点击播放，或换一个浏览器支持的媒体格式。'); }
  }

  async function processMedia() {
    if (!file || !duration || busy) return;
    if (duration > 600) { setError('请选择 10 分钟以内的媒体。'); return; }
    const controller = new AbortController(); processing.current?.abort(); processing.current = controller;
    setBusy(true); setError('');
    try {
      let data: { segments: unknown };
      if (savedMedia && window.inflow) {
        const processed = await window.inflow.transcribe(savedMedia.id, desktopJob(controller));
        const items = await window.inflow.list();
        if (controller.signal.aborted) return;
        setSavedMedia(processed); setLibrary(items);
        data = processed;
      } else {
        if (!(file instanceof File)) return;
        const form = new FormData(); form.append('file', file);
        const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal: controller.signal });
        data = await response.json();
        if (!response.ok) throw new Error((data as { error?: string }).error || '处理失败，请重试。');
      }
      const result = validateSegments(data.segments);
      if (result[result.length-1].end > duration + 0.25) throw new Error('处理时间范围超出媒体长度，请重试。');
      if (controller.signal.aborted) return;
      media.current?.pause(); setSegments(result); setIndex(0); hideText();
      if (media.current) media.current.currentTime = result[0].start;
      setPosition(result[0].start);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof TypeError || failure instanceof SyntaxError ? '处理服务连接中断，请重试。' : failure instanceof Error ? failure.message : '处理失败，请重试。');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  async function toggleTranslation() {
    if (translationOpen) { setTranslationOpen(false); return; }
    if (!segment) return;
    setTranslationOpen(true);
    if (translation || translationBusy) return;
    const controller = new AbortController(); translating.current?.abort(); translating.current = controller;
    setTranslationBusy(true); setTranslationError('');
    try {
      if (window.inflow) {
        const translated = await window.inflow.translate(segment.text, desktopJob(controller));
        if (!controller.signal.aborted) setTranslation(translated);
        return;
      }
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: segment.text }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok || typeof data.translation !== 'string' || !data.translation.trim()) throw new Error(data.error || '翻译失败，请收起后重试。');
      if (!controller.signal.aborted) setTranslation(data.translation);
    } catch (failure) {
      if (!controller.signal.aborted) setTranslationError(failure instanceof TypeError || failure instanceof SyntaxError ? '翻译服务连接中断，请收起后重试。' : failure instanceof Error ? failure.message : '翻译失败，请重试。');
    } finally { if (!controller.signal.aborted) setTranslationBusy(false); }
  }

  const mediaProps = {
    src, preload: 'metadata',
    onLoadedMetadata: () => {
      const el = media.current;
      if (!el) return;
      el.playbackRate = rate;
      if (savedMedia) el.currentTime = savedMedia.learning.position;
      if (Number.isFinite(el.duration)) { setDuration(el.duration); if (el.duration > 600) setError('媒体可试听；自动处理支持 10 分钟以内的媒体。'); }
      else setError('无法读取媒体时长，请换一个格式重试。');
    },
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
    onTimeUpdate: () => {
      const el = media.current;
      if (!el) return;
      if (segment && !el.paused && el.currentTime >= segment.end) {
        if (loop) el.currentTime = segment.start;
        else { el.pause(); el.currentTime = segment.end; }
      }
      setPosition(el.currentTime);
    },
    onEnded: () => {
      if (loop && segment && media.current) { media.current.currentTime = segment.start; void media.current.play().catch(() => setError('循环播放中断，请再次点击播放。')); }
      else setPlaying(false);
    },
    onError: () => setError('浏览器无法播放此媒体，请尝试 MP3、MP4 或 WebM 格式。'),
  };

  return <div className="app-shell">
    <aside className="desktop-sidebar" aria-label="主导航">
      <div className="sidebar-brand"><span>inflow</span><Image src="/icon.svg" alt="" width={32} height={32}/></div>
      <nav>
        <a className="active" href="#practice"><span aria-hidden="true">⌂</span>学习</a>
        <a href="#library"><span aria-hidden="true">▱</span>素材库</a>
        {desktop && <a href="#notebook"><span aria-hidden="true">♡</span>词汇本</a>}
        {desktop && <a href="#artifacts"><span aria-hidden="true">▤</span>学习短文</a>}
        <a href="#history"><span aria-hidden="true">▥</span>学习记录</a>
      </nav>
      <div className="sidebar-secondary">
        <a href="#settings"><span aria-hidden="true">⚙</span>设置</a>
        <a href="#help"><span aria-hidden="true">?</span>帮助</a>
      </div>
      <p>A<br/>Brighter<br/>You ☀</p>
    </aside>
    <main className="listening-page" id="practice">
    <header className="masthead">
      <Link className="home-link" href="/" aria-label="返回首页">‹</Link>
      <div className="brand"><div><span>Inflow</span><Image src="/icon.svg" alt="" width={36} height={36}/></div><p>让好内容，成为你的外语老师</p></div>
      <button className="import-icon" onClick={() => void importMedia()} aria-label="导入媒体">＋</button>
    </header>
    <input className="file-input" ref={picker} type="file" accept="audio/*,video/*,.m4a,.mp3,.mp4,.wav,.webm,.ogg,.flac,.aac,.mov" aria-label="选择音频或视频" onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
    <div className="desktop-topbar">
      <button className="desktop-import" onClick={() => void importMedia()}><span aria-hidden="true">⌕</span><span>{file?.name || '导入你喜欢的影音素材...'}</span><b aria-hidden="true">＋</b></button>
      <button className="notification" aria-label="通知">♧</button>
    </div>
    {!!library.length && <div className="import-status" id="library"><label>素材库 <select aria-label="已保存素材" value={savedMedia?.id || ''} onChange={event => void openSaved(event.target.value)}>{library.map(item => <option key={item.id} value={item.id}>{item.name}{item.missing ? '（文件丢失）' : ''}</option>)}</select></label></div>}
    {savedMedia?.missing && <button className="process-button" onClick={() => void openSaved(savedMedia.id, true)}>重新关联媒体</button>}
    <div className="practice-layout">
    <div className="practice-column">
    <section className="media-card" aria-label="媒体播放器">
      {src && video ? <video key={src} ref={el => { media.current = el; }} {...mediaProps} playsInline onClick={() => void play()} aria-label="视频播放器"/> : <>
        {src && <audio key={src} ref={el => { media.current = el; }} {...mediaProps} aria-label="音频播放器"/>}
        <div className="audio-art"><div className="sun" aria-hidden="true">☀</div><div className="soundwave" aria-hidden="true">{[18,36,58,82,48,68,94,54,36,62,24].map((height,n) => <i key={n} style={{ height }}/> )}</div><h1>{file ? '听见每一句' : '从一段喜欢的声音开始'}</h1><p>{file ? '先听，再慢慢揭晓。' : '导入韩语音频或视频，开启精听。'}</p>{!file && <button className="primary" onClick={() => void importMedia()}>选择媒体 ＋</button>}</div>
      </>}
      {src && <span className="media-duration">{clock(duration)}</span>}
    </section>
    <div className="timeline"><button className="play-button" onClick={() => void play()} disabled={!duration} aria-label={playing ? '暂停' : '播放'}>{playing ? 'Ⅱ' : '▶'}</button>
      <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(position,duration || 1)} disabled={!duration} aria-label="播放进度" onChange={event => {
        let time = Number(event.target.value);
        if (segments.length) {
          let next = segments.findIndex(s => time < s.end); if (next < 0) next = segments.length-1;
          if (next !== index) { setIndex(next); hideText(); }
          time = Math.max(segments[next].start, Math.min(time,segments[next].end-0.02));
        }
        if (media.current) media.current.currentTime = time; setPosition(time);
      }}/><span>{clock(position)} / {clock(duration)}</span></div>
    <div className="import-status"><span title={file?.name}>{file?.name || '支持音频与视频 · 50 MB / 10 分钟以内'}</span>{file && <button className="process-button" disabled={!src || !duration || duration > 600 || busy} onClick={() => void processMedia()}>{busy ? '正在转写与切句…' : segments.length ? '重新处理' : '开始处理'}</button>}</div>
    {busy && <button className="process-button" onClick={() => { processing.current?.abort(); setBusy(false); }}>取消处理</button>}
    <p className="processing-note">媒体在当前 Inflow 服务上处理，不发送至第三方。{busy ? '处理期间仍可试听。' : '自动结果可能有误。'}</p>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="transport"><button disabled={!segment || index===0} onClick={() => select(index-1)}>◀Ⅰ <span>上一句</span></button>
      <RevealMenu key={`${src}-${index}`} disabled={!segment} onSelect={selectReveal}/>
      <button disabled={!segment || index===segments.length-1} onClick={() => select(index+1)}><span>下一句</span> Ⅰ▶</button></div>
    <section className="transcript" aria-label="当前句原文" aria-live="polite">
      <div className="sentence-meta"><span>{segment ? `第 ${index+1} / ${segments.length} 句 · ${clock(segment.start)}–${clock(segment.end)}` : '当前句'}</span>{reveal && <button onClick={() => setReveal(null)}>隐藏原文</button>}</div>
      {segment ? <p ref={transcript} lang="ko">{segment.groups.map((group,n) => <span key={n} className={reveal && n < revealedGroupCount(segment.groups,reveal) ? 'meaning-group' : 'hidden-group'}>{reveal && n < revealedGroupCount(segment.groups,reveal) ? group : <span aria-label="未揭晓意群">•••</span>}{' '}</span>)}</p> : <p className="empty-text">{busy ? '正在听清每一句…' : '处理媒体后，从这里揭晓原文'}</p>}
    </section>
    {desktop && <div className="collection-controls"><button className="process-button" disabled={!savedMedia?.segments[index] || !reveal} onMouseDown={event => event.preventDefault()} onClick={collectSelection}>收藏选中文字</button>{collectionError && <p className="notice" role="alert">{collectionError}</p>}</div>}
    <div className="tools"><label><select aria-label="播放倍速" value={rate} onChange={event => { const next = Number(event.target.value); setRate(next); if (media.current) media.current.playbackRate = next; }}>{[0.5,0.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{value}×</option>)}</select><span>倍速</span></label>
      <button disabled={!segment} aria-pressed={loop} onClick={() => setLoop(value => !value)}><span className="tool-symbol" aria-hidden="true">↻</span><span>{loop ? '循环中' : '循环'}</span></button>
      <button disabled={!segment} aria-expanded={translationOpen} onClick={() => void toggleTranslation()}><span className="translate-symbol" aria-hidden="true">文ᴬ</span><span>翻译</span></button></div>
    <section className={`translation ${translationOpen ? 'expanded' : ''}`} aria-label="当前句译文" aria-live="polite">
      {translationOpen ? <><div className="translation-heading"><span>中文译文</span><button onClick={() => setTranslationOpen(false)} aria-label="收起译文">收起 ×</button></div><p>{translationBusy ? '正在生成译文…' : translationError || translation}</p></> : <button disabled={!segment} onClick={() => void toggleTranslation()}><span aria-hidden="true">☼</span> 按需查看这一句的意思 <span aria-hidden="true">›</span></button>}
    </section>
    <p className="footer-note">一次听清一点。<br/>长按 reveal 滑动选择；也可点击展开。</p>
    </div>
    <aside className="segment-panel" aria-label="全文句子列表">
      <div className="segment-panel-header"><strong>原文</strong><span>译文</span><b aria-hidden="true">☷</b></div>
      <div className="segment-list">
        {segments.length ? segments.map((item, itemIndex) => <button key={`${item.start}-${itemIndex}`} className={itemIndex === index ? 'active' : ''} onClick={() => select(itemIndex)}><time>{clock(item.start)}</time><span>{item.text}</span></button>) : <div className="segment-empty"><span>☊</span><p>导入并处理素材后<br/>完整原文会显示在这里</p></div>}
      </div>
    </aside>
    </div>
    {desktop && <VocabularyNotebook collection={collection} onDismiss={() => setCollection(null)} onOpenSource={source => void openVocabularySource(source)}/>}
    </main>
  </div>;
}
