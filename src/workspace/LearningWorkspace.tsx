"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateSegments, type Segment } from '@/listening/processing';
import { managedMediaUrl, type SavedMedia, type MediaVocabularySource, type PlaybackMode } from '@/listening/desktop';
import { type RevealChoice } from '@/listening/reveal';
import VocabularyNotebook, { type VocabularyDraft } from '@/listening/VocabularyNotebook';
import TopNav from '@/workspace/TopNav';
import LibraryDrawer from '@/workspace/LibraryDrawer';
import VideoStage from '@/workspace/VideoStage';
import SentenceArea from '@/workspace/SentenceArea';
import ContextPanel from '@/workspace/ContextPanel';
import '@/workspace/workspace.css';

export default function LearningWorkspace() {
  const media = useRef<HTMLMediaElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLParagraphElement>(null);
  const processing = useRef<AbortController | null>(null);
  const translating = useRef<AbortController | null>(null);
  const autoProcess = useRef('');
  const fileChoice = useRef(0);
  const [view, setView] = useState<'video' | 'vocab'>('video');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [library, setLibrary] = useState<SavedMedia[]>([]);
  const [savedMedia, setSavedMedia] = useState<SavedMedia | null>(null);
  const [file, setFile] = useState<File | { name: string; type: string } | null>(null);
  const [src, setSrc] = useState('');
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<PlaybackMode>('full');
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [reveal, setReveal] = useState<RevealChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [collection, setCollection] = useState<VocabularyDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const segment = segments[index] ?? null;
  const video = !!file && (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name));
  const canPlay = !!src && ready && duration > 0 && duration <= 600;
  const selectReveal = useCallback((choice: RevealChoice) => setReveal(choice), []);
  const hideText = useCallback(() => {
    setReveal(null); setTranslationOpen(false); setTranslation(''); setTranslationError(''); setTranslationBusy(false);
    translating.current?.abort();
  }, []);

  const applySaved = useCallback((next: SavedMedia) => {
    processing.current?.abort(); translating.current?.abort(); media.current?.pause(); autoProcess.current = '';
    setSavedMedia(next); setFile({ name: next.name, type: next.video ? 'video/' : 'audio/' });
    setSrc(next.missing || next.learning.duration > 600 ? '' : managedMediaUrl(next.id));
    setReady(false); setDuration(next.learning.duration); setPosition(next.learning.position); setIndex(next.learning.index);
    setMode(next.learning.mode ?? 'full'); setRate(next.learning.rate); setLoop(next.learning.loop); setSegments(next.segments);
    setPlaying(false); setBusy(false); setShowContext(false); hideText();
    setError(next.missing ? '媒体文件丢失，原文和学习记录仍保留，请重新关联同一文件。' : next.learning.duration > 600 ? '此素材超过 10 分钟，已禁止播放；原文和学习记录仍保留。' : '');
  }, [hideText]);

  useEffect(() => () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { processing.current?.abort(); translating.current?.abort(); }, []);
  useEffect(() => {
    const host = window.inflow;
    if (!host) return;
    let active = true;
    Promise.all([host.restore(), host.list()]).then(([restored, items]) => {
      if (!active) return;
      setDesktop(true); setLibrary(items);
      if (restored) applySaved(restored);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '素材恢复失败，请重试。'); });
    return () => { active = false; };
  }, [applySaved]);
  useEffect(() => {
    if (!savedMedia || !ready || !duration || duration > 600) return;
    void window.inflow?.saveLearning(savedMedia.id, { position, index, rate, loop, duration, mode })
      .catch(failure => setError(failure instanceof Error ? failure.message : '学习记录保存失败。'));
  }, [savedMedia, ready, duration, position, index, rate, loop, mode]);

  const syncPlayback = useCallback((updateTime = true) => {
    const el = media.current;
    if (!el) return;
    if (mode === 'sentence' && segment && !el.paused) {
      if (el.currentTime < segment.start) el.currentTime = segment.start;
      if (el.currentTime >= segment.end) {
        if (loop) el.currentTime = segment.start;
        else { el.pause(); el.currentTime = segment.end; }
        setPosition(el.currentTime);
      }
    } else if (mode === 'full' && segments.length) {
      const next = Math.max(0, segments.findLastIndex(item => item.start <= el.currentTime));
      if (next !== index) { setIndex(next); hideText(); }
    }
    if (updateTime) setPosition(el.currentTime);
  }, [mode, segment, loop, segments, index, hideText]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => { syncPlayback(false); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, syncPlayback]);

  function showVocab() { media.current?.pause(); setView('vocab'); }

  async function importMedia() {
    if (!window.inflow) { picker.current?.click(); return; }
    try {
      const next = await window.inflow.importMedia();
      if (!next) return;
      applySaved(next); autoProcess.current = managedMediaUrl(next.id);
      setView('video'); setLibraryOpen(false); setLibrary(await window.inflow.list());
    } catch (failure) { setError(failure instanceof Error ? failure.message : '导入失败，请重试。'); }
  }

  async function openSaved(id: string, relink = false) {
    if (!relink && id === savedMedia?.id) { setView('video'); setLibraryOpen(false); return; }
    try {
      const next = relink ? await window.inflow!.relink(id) : await window.inflow!.open(id);
      if (!next) return;
      applySaved(next); setView('video'); setLibraryOpen(false); setLibrary(await window.inflow!.list());
      if (media.current && next.id === savedMedia?.id && !next.missing && next.learning.duration <= 600) {
        media.current.currentTime = next.learning.position; media.current.playbackRate = next.learning.rate; setReady(true);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '素材打开失败，请重试。'); }
  }

  function desktopJob(controller: AbortController) {
    const job = crypto.randomUUID();
    controller.signal.addEventListener('abort', () => { void window.inflow?.cancel(job).catch(() => {}); }, { once: true });
    return job;
  }

  async function chooseFile(next: File | undefined) {
    if (!next) return;
    const choice = ++fileChoice.current;
    if (!next.size || next.size > 50 * 1024 * 1024 || (!/^(audio|video)\//.test(next.type) && !/\.(mp3|mp4|wav|m4a|ogg|webm|mov|flac|aac)$/i.test(next.name))) {
      setError('请选择 50 MB 以内的音频或视频文件。'); return;
    }
    const url = URL.createObjectURL(next);
    const probe = document.createElement('video');
    try {
      const length = await new Promise<number>((resolve, reject) => {
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => resolve(probe.duration);
        probe.onerror = () => reject(new Error('无法读取媒体，请换一个支持的格式重试。'));
        probe.src = url;
      });
      if (!Number.isFinite(length) || length <= 0 || length > 600) throw new Error('请选择 10 分钟以内的有效媒体，超长素材不会导入或播放。');
      if (choice !== fileChoice.current) { URL.revokeObjectURL(url); return; }
      processing.current?.abort(); translating.current?.abort(); media.current?.pause();
      setSavedMedia(null); setFile(next); setSrc(url); setReady(false); setDuration(length); setPosition(0); setPlaying(false);
      setSegments([]); setIndex(0); setMode('full'); setRate(1); setLoop(false); setBusy(false); setError(''); setShowContext(false); hideText();
      autoProcess.current = url; setView('video'); setLibraryOpen(false);
    } catch (failure) {
      URL.revokeObjectURL(url);
      if (choice === fileChoice.current) setError(failure instanceof Error ? failure.message : '导入失败，请重试。');
    } finally { probe.removeAttribute('src'); probe.load(); }
  }

  function select(next: number) {
    if (!segments[next]) return;
    media.current?.pause(); setMode('sentence'); setIndex(next); hideText();
    if (media.current) media.current.currentTime = segments[next].start;
    setPosition(segments[next].start);
  }

  function seek(value: number) {
    let time = Math.max(0, Math.min(value, duration));
    if (segments.length) {
      let next = mode === 'full' ? Math.max(0, segments.findLastIndex(item => item.start <= time)) : segments.findIndex(item => time < item.end);
      if (next < 0) next = segments.length - 1;
      if (next !== index) { setIndex(next); hideText(); }
      if (mode === 'sentence') time = Math.max(segments[next].start, Math.min(time, segments[next].end - 0.02));
    }
    if (media.current) media.current.currentTime = time;
    setPosition(time);
  }

  function collectSelection() {
    if (editing || collection) { showVocab(); setError('请先保存或取消当前词汇草稿。'); return; }
    const selection = window.getSelection();
    const surface = selection?.toString().trim();
    const source = savedMedia?.segments[index];
    if (!source || !selection?.rangeCount || !surface || surface.length > 100 ||
      !transcript.current?.contains(selection.anchorNode) || !transcript.current.contains(selection.focusNode) ||
      selection.getRangeAt(0).cloneContents().querySelector('.hidden-group') ||
      !source.text.replace(/\s+/gu, ' ').includes(surface.replace(/\s+/gu, ' '))) {
      setError('请在已揭晓的当前句中选中要收藏的词语（100 字以内）。'); return;
    }
    setError('');
    setCollection({ key: crypto.randomUUID(), lemma: surface, meaningZh: '', source: { reference: { segmentId: source.id, surface }, surface, sentence: source.text, sourceName: savedMedia!.name } });
    showVocab();
  }

  async function openVocabularySource(source: MediaVocabularySource) {
    try {
      const saved = await window.inflow!.open(source.mediaId);
      let next = saved.segments.findIndex(item => item.id === source.segmentId);
      const historical = next < 0;
      if (historical) next = Math.max(0, saved.segments.findLastIndex(item => item.start <= source.start));
      const position = saved.segments[next]?.start ?? source.start;
      applySaved({ ...saved, learning: { ...saved.learning, index: next, position, mode: 'sentence' } });
      setView('video'); setLibraryOpen(false);
      if (media.current && saved.id === savedMedia?.id && !saved.missing && saved.learning.duration <= 600) { media.current.currentTime = position; setReady(true); }
      if (historical && !saved.missing) setError('素材已重新转写，已打开相近位置；收藏时的原句仍保留。');
    } catch (failure) { setError(failure instanceof Error ? failure.message : '来源素材无法打开。'); }
  }

  async function play() {
    const el = media.current;
    if (!el || !canPlay) return;
    if (!el.paused) { el.pause(); return; }
    if (mode === 'sentence' && segment && (el.currentTime < segment.start || el.currentTime >= segment.end - 0.02)) el.currentTime = segment.start;
    try { await el.play(); } catch { setError('播放未能开始，请重试或换一个支持的媒体格式。'); }
  }

  async function processMedia(length = duration) {
    if (!file || !length || length > 600 || busy) return;
    const controller = new AbortController(); processing.current?.abort(); processing.current = controller;
    setBusy(true); setError('');
    try {
      let data: { segments: unknown };
      let processedMedia: SavedMedia | null = null;
      if (savedMedia && window.inflow) {
        const processed = await window.inflow.transcribe(savedMedia.id, desktopJob(controller));
        if (controller.signal.aborted) return;
        data = processed; processedMedia = processed;
      } else {
        if (!(file instanceof File)) return;
        const form = new FormData(); form.append('file', file);
        const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal: controller.signal });
        data = await response.json();
        if (!response.ok) throw new Error((data as { error?: string }).error || '处理失败，请重试。');
      }
      const result = validateSegments(data.segments);
      if (result.at(-1)!.end > length + 0.25) throw new Error('处理时间范围超出媒体长度，请重试。');
      if (controller.signal.aborted) return;
      const time = media.current?.currentTime ?? position;
      setSegments(result); setIndex(Math.max(0, result.findLastIndex(item => item.start <= time))); setPosition(time); hideText();
      if (processedMedia) {
        setSavedMedia(processedMedia);
        const items = await window.inflow!.list();
        if (!controller.signal.aborted) setLibrary(items);
      }
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
      if (!controller.signal.aborted) setTranslationError(failure instanceof Error ? failure.message : '翻译失败，请重试。');
    } finally { if (!controller.signal.aborted) setTranslationBusy(false); }
  }

  const mediaProps = {
    preload: 'metadata',
    onLoadedMetadata: () => {
      const el = media.current;
      if (!el) return;
      if (!Number.isFinite(el.duration) || el.duration <= 0 || el.duration > 600) {
        el.pause(); setSrc(''); setReady(false); autoProcess.current = ''; setError('此素材无法播放，请使用 10 分钟以内的有效媒体。'); return;
      }
      el.playbackRate = rate;
      if (savedMedia) el.currentTime = savedMedia.learning.position;
      setDuration(el.duration); setReady(true);
      if (autoProcess.current === src) { autoProcess.current = ''; void processMedia(el.duration); }
    },
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
    onClick: () => void play(),
    onTimeUpdate: () => syncPlayback(),
    onEnded: () => {
      if (mode === 'sentence' && loop && segment && media.current) {
        media.current.currentTime = segment.start;
        void media.current.play().catch(() => setError('循环播放中断，请再次点击播放。'));
      } else setPlaying(false);
    },
    onError: () => { setReady(false); setError('无法播放此媒体，请尝试 MP3、MP4 或 WebM 格式。'); },
  };

  const status = <div className="workspace-status">
    <span title={file?.name}>{file?.name || '支持音频与视频 · 50 MB / 10 分钟以内'}</span>
    {file && (busy ? <><span role="status">正在转写与切句…</span><button onClick={() => { processing.current?.abort(); setBusy(false); }}>取消处理</button></> : <button disabled={!canPlay || editing || !!collection} onClick={() => void processMedia()}>{segments.length ? '重新处理' : '开始处理 / 重试'}</button>)}
    {savedMedia?.missing && <button onClick={() => void openSaved(savedMedia.id, true)}>重新关联媒体</button>}
    <small>本地处理 · 自动结果可能有误</small>
  </div>;

  return <div className="workspace-shell">
    <TopNav activeView={view} libraryOpen={libraryOpen} onOpenLibrary={() => setLibraryOpen(true)} onShowVideo={() => setView('video')} onShowVocab={showVocab}/>
    <input className="file-input" ref={picker} type="file" accept="audio/*,video/*,.m4a,.mp3,.mp4,.wav,.webm,.ogg,.flac,.aac,.mov" aria-label="选择音频或视频" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
    {error && <p className="notice workspace-notice" role="alert">{error}</p>}
    <main className="workspace-content-grid" hidden={view !== 'video'}>
      <div className="workspace-main-column">
        <VideoStage src={src} video={video} name={file?.name ?? ''} mediaRef={el => { media.current = el; }} mediaProps={mediaProps} duration={duration} position={position} onSeek={seek} status={status}/>
        {!file && <button className="workspace-primary-button workspace-start" onClick={() => void importMedia()}>导入媒体</button>}
        <SentenceArea segment={segment} index={index} total={segments.length} mode={mode} onModeChange={next => { if (next === 'sentence') select(index); else setMode('full'); }} canPlay={canPlay} playing={playing} onPlayPause={() => void play()} onPrevious={() => select(index - 1)} onNext={() => select(index + 1)} reveal={reveal} onReveal={selectReveal} onHideText={() => setReveal(null)} transcriptRef={transcript} collectionDisabled={!desktop || !savedMedia?.segments[index] || !reveal || busy || editing || !!collection} onCollect={collectSelection} rate={rate} onRateChange={next => { setRate(next); if (media.current) media.current.playbackRate = next; }} loop={loop} onLoopChange={setLoop} translationOpen={translationOpen} translation={translation} translationBusy={translationBusy} translationError={translationError} onToggleTranslation={() => void toggleTranslation()}/>
      </div>
      <ContextPanel segments={segments} index={index} onSelect={select} showText={showContext} onToggleText={() => setShowContext(value => !value)}/>
    </main>
    <section className="workspace-vocab" hidden={view !== 'vocab'} aria-label="Vocab workspace">
      {desktop ? <VocabularyNotebook collection={collection} onDismiss={() => setCollection(null)} onOpenSource={source => void openVocabularySource(source)} onEditingChange={setEditing} active={view === 'vocab'}/> : <p className="workspace-empty">词汇本在 Inflow 桌面应用中可用。</p>}
    </section>
    <LibraryDrawer open={libraryOpen} items={library} currentId={savedMedia?.id} onClose={() => setLibraryOpen(false)} onImport={() => void importMedia()} onOpen={id => void openSaved(id)} onRelink={id => void openSaved(id, true)}/>
  </div>;
}
