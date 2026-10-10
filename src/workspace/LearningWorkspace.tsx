"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { validateSegments, type Segment } from '@/listening/processing';
import { defaultVideoMaskColor, initialVideoMask, type VideoMask } from '@/listening/video-mask';
import { managedMediaUrl, type ApplicationSettings, type CredentialStatus, type SavedMedia, type MediaVocabularySource, type ArtifactVocabularySource, type VocabularyContext, type VocabularyEntry, type PlaybackMode } from '@/listening/desktop';
import VocabularyNotebook, { type VocabularyNotebookHandle } from '@/listening/VocabularyNotebook';
import VocabularySelection, { type VocabularySelectionHandle } from '@/listening/VocabularySelection';
import ArtifactLibrary from '@/listening/ArtifactLibrary';
import TopNav from '@/workspace/TopNav';
import LibraryDrawer from '@/workspace/LibraryDrawer';
import VideoStage from '@/workspace/VideoStage';
import SentenceArea from '@/workspace/SentenceArea';
import ContextPanel from '@/workspace/ContextPanel';
import StoryTargetsDialog from '@/workspace/StoryTargetsDialog';
import SettingsDialog from '@/workspace/SettingsDialog';
import { useLearningArtifacts } from '@/workspace/useLearningArtifacts';
import '@/workspace/workspace.css';

const measureStage = (column: HTMLDivElement | null) => ({
  height: column?.querySelector<HTMLElement>('.workspace-video-stage')?.clientHeight ?? 180,
  max: Math.min(720, Math.max(140, (column?.clientHeight ?? 600) - 260)),
});
const measureContext = (grid: HTMLElement | null) => ({
  width: grid?.querySelector<HTMLElement>('.workspace-context-panel')?.clientWidth ?? 280,
  max: Math.min(480, Math.max(240, (grid?.clientWidth ?? 1000) - 520)),
});
const defaultVideoRatio = 16 / 9;

export default function LearningWorkspace() {
  const media = useRef<HTMLMediaElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLParagraphElement>(null);
  const mainColumn = useRef<HTMLDivElement>(null);
  const contentGrid = useRef<HTMLElement>(null);
  const contextDrag = useRef<{ id: number; x: number; width: number } | null>(null);
  const [contextWidth, setContextWidth] = useState<number>();
  const [contextSize, setContextSize] = useState({ width: 280, max: 480 });
  const stageDrag = useRef<{ id: number; y: number; height: number } | null>(null);
  const [stageHeight, setStageHeight] = useState<number>();
  const [stageSize, setStageSize] = useState({ height: 180, max: 180 });
  const [videoRatio, setVideoRatio] = useState(defaultVideoRatio);
  const processing = useRef<AbortController | null>(null);
  const translating = useRef<AbortController | null>(null);
  const autoProcess = useRef('');
  const fileChoice = useRef(0);
  const [view, setView] = useState<'video' | 'vocab'>('video');
  const [contentKind, setContentKind] = useState<'media' | 'story'>('media');
  const [vocabularyEntries, setVocabularyEntries] = useState<VocabularyEntry[]>([]);
  const [generationTargets, setGenerationTargets] = useState<VocabularyEntry[]>([]);
  const [targetSelectionOpen, setTargetSelectionOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ApplicationSettings>({ videoMaskColor: defaultVideoMaskColor });
  const [credential, setCredential] = useState<CredentialStatus>({ configured: false });
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
  const [masks, setMasks] = useState<Record<string, number[]>>({});
  const [maskEditing, setMaskEditing] = useState(false);
  const [videoMask, setVideoMask] = useState<VideoMask>();
  const [videoMaskEditing, setVideoMaskEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const vocabularySelection = useRef<VocabularySelectionHandle>(null);
  const vocabularyNotebook = useRef<VocabularyNotebookHandle>(null);
  const [vocabularyRevision, setVocabularyRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translation, setTranslation] = useState('');
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const segment = segments[index] ?? null;
  const video = !!file && (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name));
  const canPlay = !!src && ready && duration > 0 && duration <= 600;
  useEffect(() => {
    const column = mainColumn.current;
    const stage = column?.querySelector<HTMLElement>('.workspace-video-stage');
    const grid = contentGrid.current;
    const context = grid?.querySelector<HTMLElement>('.workspace-context-panel');
    if (!column || !stage || !grid || !context) return;
    const observer = new ResizeObserver(() => {
      if (!column.clientHeight) return;
      setStageSize(measureStage(column));
      if (grid.clientWidth > 860) setContextSize(measureContext(grid));
    });
    observer.observe(column); observer.observe(stage);
    observer.observe(grid); observer.observe(context);
    return () => observer.disconnect();
  }, []);
  const resizeStage = (height: number) => setStageHeight(Math.max(140, Math.min(measureStage(mainColumn.current).max, height)));
  const resizeContext = (width: number) => setContextWidth(Math.max(240, Math.min(measureContext(contentGrid.current).max, width)));
  const resetSentence = useCallback(() => {
    if (vocabularySelection.current?.beforeChange() === false) return;
    setMaskEditing(false); setTranslationOpen(false); setTranslation(''); setTranslationError(''); setTranslationBusy(false);
    translating.current?.abort();
  }, []);

  const applySaved = useCallback((next: SavedMedia) => {
    if (vocabularySelection.current?.beforeChange() === false) return false;
    processing.current?.abort(); translating.current?.abort(); media.current?.pause(); autoProcess.current = '';
    setSavedMedia(next); setFile({ name: next.name, type: next.video ? 'video/' : 'audio/' });
    setStageHeight(undefined); setVideoRatio(defaultVideoRatio);
    setSrc(next.missing || next.learning.duration > 600 ? '' : managedMediaUrl(next.id));
    setReady(false); setDuration(next.learning.duration); setPosition(next.learning.position); setIndex(next.learning.index);
    setMode(next.learning.mode ?? 'full'); setRate(next.learning.rate); setLoop(next.learning.loop); setSegments(next.segments); setMasks(next.learning.masks ?? {});
    setVideoMask(next.learning.videoMask); setVideoMaskEditing(false);
    setPlaying(false); setBusy(false); setShowContext(false); resetSentence();
    setError(next.missing ? '媒体文件丢失，原文和学习记录仍保留，请重新关联同一文件。' : next.learning.duration > 600 ? '此素材超过 10 分钟，已禁止播放；原文和学习记录仍保留。' : '');
    return true;
  }, [resetSentence]);

  useEffect(() => () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { processing.current?.abort(); translating.current?.abort(); }, []);
  useEffect(() => {
    const host = window.inflow;
    if (!host) return;
    let active = true;
    Promise.all([host.restore(), host.list(), host.getSettings(), host.credentialStatus()]).then(([restored, items, preferences, status]) => {
      if (!active) return;
      setDesktop(true); setLibrary(items);
      setSettings(preferences); setCredential(status);
      if (restored) applySaved(restored);
    }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : '素材恢复失败，请重试。'); });
    return () => { active = false; };
  }, [applySaved]);
  useEffect(() => {
    if (!savedMedia || !duration) return;
    void window.inflow?.saveLearning(savedMedia.id, { position, index, rate, loop, duration, mode, masks, videoMask })
      .catch(failure => setError(failure instanceof Error ? failure.message : '学习记录保存失败。'));
  }, [savedMedia, duration, position, index, rate, loop, mode, masks, videoMask]);

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
      if (next !== index) {
        if (vocabularySelection.current?.beforeChange() === false) { el.pause(); return; }
        setIndex(next); resetSentence();
      }
    }
    if (updateTime) setPosition(el.currentTime);
  }, [mode, segment, loop, segments, index, resetSentence]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => { syncPlayback(false); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, syncPlayback]);

  const allowChange = useCallback(() => vocabularySelection.current?.beforeChange() !== false && vocabularyNotebook.current?.beforeChange() !== false, []);
  const updateVocabularyEntries = useCallback((entries: VocabularyEntry[]) => {
    setVocabularyEntries(entries); setGenerationTargets(entries.filter(entry => entry.selected));
  }, []);
  const learningArtifacts = useLearningArtifacts(desktop, allowChange);
  const { artifacts, selection: { artifact: activeArtifact } } = learningArtifacts;
  const sentenceKey = savedMedia?.segments[index]?.id ?? String(index);
  const maskedGroups = masks[sentenceKey] ?? [];
  function toggleMaskEditing() {
    if (!allowChange()) return;
    media.current?.pause(); window.getSelection()?.removeAllRanges();
    setMaskEditing(value => !value);
  }
  function toggleGroup(group: number) {
    if (!segment || !maskEditing || !allowChange()) return;
    setMasks(previous => {
      const next = { ...previous };
      const groups = previous[sentenceKey] ?? [];
      const selected = groups.includes(group) ? groups.filter(value => value !== group) : [...groups, group].sort((a, b) => a - b);
      if (selected.length) next[sentenceKey] = selected;
      else delete next[sentenceKey];
      return next;
    });
  }
  function toggleVideoMask() {
    if (!allowChange()) return;
    if (videoMask?.enabled) { setVideoMask({ ...videoMask, enabled: false }); setVideoMaskEditing(false); return; }
    setVideoMask({ ...(videoMask ?? initialVideoMask), enabled: true });
    if (!videoMask) { media.current?.pause(); setVideoMaskEditing(true); }
  }
  function toggleVideoMaskEditing() {
    if (!allowChange() || !videoMask?.enabled) return;
    if (!videoMaskEditing) media.current?.pause();
    setVideoMaskEditing(value => !value);
  }
  function showVocab() { if (allowChange()) { media.current?.pause(); setView('vocab'); } }

  function openSettings() {
    if (!allowChange()) return;
    if (window.inflow && !desktop) { setError('Settings are not ready. Please wait for the library to load.'); return; }
    if (editing) { setError('Save or cancel the current vocabulary draft before opening Settings.'); return; }
    media.current?.pause(); setLibraryOpen(false); setSettingsOpen(true);
  }

  async function importMedia() {
    if (!allowChange()) return;
    if (!window.inflow) { picker.current?.click(); return; }
    try {
      const next = await window.inflow.importMedia();
      if (!next) return;
      if (!applySaved(next)) return;
      autoProcess.current = managedMediaUrl(next.id);
      setContentKind('media'); setView('video'); setLibraryOpen(false); setLibrary(await window.inflow.list());
    } catch (failure) { setError(failure instanceof Error ? failure.message : '导入失败，请重试。'); }
  }

  async function openSaved(id: string, relink = false) {
    if (!allowChange()) return;
    if (!relink && id === savedMedia?.id) { setContentKind('media'); setView('video'); setLibraryOpen(false); return; }
    try {
      const next = relink ? await window.inflow!.relink(id) : await window.inflow!.open(id);
      if (!next) return;
      if (!applySaved(next)) return;
      setContentKind('media'); setView('video'); setLibraryOpen(false); setLibrary(await window.inflow!.list());
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
    if (!next || !allowChange()) return;
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
      setStageHeight(undefined); setVideoRatio(defaultVideoRatio);
      setSegments([]); setIndex(0); setMode('full'); setRate(1); setLoop(false); setMasks({}); setVideoMask(undefined); setVideoMaskEditing(false); setBusy(false); setError(''); setShowContext(false); resetSentence();
      autoProcess.current = url; setContentKind('media'); setView('video'); setLibraryOpen(false);
    } catch (failure) {
      URL.revokeObjectURL(url);
      if (choice === fileChoice.current) setError(failure instanceof Error ? failure.message : '导入失败，请重试。');
    } finally { probe.removeAttribute('src'); probe.load(); }
  }

  function select(next: number) {
    if (!segments[next] || !allowChange()) return;
    media.current?.pause(); setMode('sentence'); setIndex(next); resetSentence();
    if (media.current) media.current.currentTime = segments[next].start;
    setPosition(segments[next].start);
  }

  function seek(value: number) {
    let time = Math.max(0, Math.min(value, duration));
    if (segments.length) {
      let next = mode === 'full' ? Math.max(0, segments.findLastIndex(item => item.start <= time)) : segments.findIndex(item => time < item.end);
      if (next < 0) next = segments.length - 1;
      if (next !== index) { if (!allowChange()) return; setIndex(next); resetSentence(); }
      if (mode === 'sentence') time = Math.max(segments[next].start, Math.min(time, segments[next].end - 0.02));
    }
    if (media.current) media.current.currentTime = time;
    setPosition(time);
  }

  async function openVocabularySource(source: MediaVocabularySource) {
    if (!allowChange()) return;
    try {
      const saved = await window.inflow!.open(source.mediaId);
      const next = saved.segments.findIndex(item => item.id === source.segmentId);
      if (next < 0) throw new Error('原句已更新，请从当前原文重新收集。');
      const position = saved.segments[next].start;
      if (!applySaved({ ...saved, learning: { ...saved.learning, index: next, position, mode: 'sentence' } })) return;
      setContentKind('media'); setView('video'); setLibraryOpen(false);
      if (media.current && saved.id === savedMedia?.id && !saved.missing && saved.learning.duration <= 600) { media.current.currentTime = position; setReady(true); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '来源素材无法打开。'); }
  }

  function openStory(source: ArtifactVocabularySource) {
    if (!learningArtifacts.openSource(source)) return;
    media.current?.pause(); setContentKind('story'); setView('video'); setLibraryOpen(false);
  }

  function openEntrySource(source: VocabularyContext['source']) {
    if (source.type === 'media') void openVocabularySource(source);
    else openStory(source);
  }

  async function openVocabularyEntry(id: string) {
    if (!allowChange()) return;
    try {
      if (!await vocabularyNotebook.current?.open(id)) return;
      media.current?.pause(); setView('vocab'); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The vocabulary entry could not be opened. Please retry.'); }
  }

  async function requestStory() {
    if (!allowChange()) return;
    if (editing) { showVocab(); setError('请先保存或取消当前词汇草稿。'); return; }
    try {
      const entries = await window.inflow!.listVocabulary();
      if (!allowChange()) return;
      setVocabularyEntries(entries); setTargetSelectionOpen(true);
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : '词汇读取失败，请重试。'); }
  }

  async function confirmStoryTargets(ids: string[]) {
    const entries = await window.inflow!.selectVocabulary(ids);
    setVocabularyEntries(entries); setGenerationTargets(entries.filter(entry => ids.includes(entry.id)));
    setTargetSelectionOpen(false); media.current?.pause(); setContentKind('story'); setView('video'); setGenerationOpen(true);
  }

  async function play() {
    const el = media.current;
    if (!el || !canPlay) return;
    if (!el.paused) { el.pause(); return; }
    if (mode === 'sentence' && segment && (el.currentTime < segment.start || el.currentTime >= segment.end - 0.02)) el.currentTime = segment.start;
    try { await el.play(); } catch { setError('播放未能开始，请重试或换一个支持的媒体格式。'); }
  }

  async function processMedia(length = duration) {
    if (!file || !length || length > 600 || busy || !allowChange()) return;
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
      setSegments(result); setIndex(Math.max(0, result.findLastIndex(item => item.start <= time))); setPosition(time); setMasks(processedMedia?.learning.masks ?? {}); resetSentence();
      if (processedMedia) {
        setSavedMedia(processedMedia);
        setVocabularyRevision(value => value + 1);
        const items = await window.inflow!.list();
        if (!controller.signal.aborted) setLibrary(items);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof TypeError || failure instanceof SyntaxError ? '处理服务连接中断，请重试。' : failure instanceof Error ? failure.message : '处理失败，请重试。');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  async function requestTranslation(options: { refresh?: boolean; local?: boolean } = {}) {
    if (!segment) return;
    const controller = new AbortController(); translating.current?.abort(); translating.current = controller;
    setTranslationOpen(true); setTranslationBusy(true); setTranslationError('');
    try {
      if (window.inflow && savedMedia) {
        const source = savedMedia.segments[index];
        if (!source) throw new Error('Please select a saved sentence.');
        const translated = await window.inflow.translate({ mediaId: savedMedia.id, segmentId: source.id }, desktopJob(controller), options);
        if (!controller.signal.aborted) setTranslation(translated);
        return;
      }
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: segment.text }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok || typeof data.translation !== 'string' || !data.translation.trim()) throw new Error(data.error || 'Translation failed. Please retry.');
      if (!controller.signal.aborted) setTranslation(data.translation);
    } catch (failure) {
      if (!controller.signal.aborted) setTranslationError(failure instanceof Error ? failure.message : 'Translation failed. Please retry.');
    } finally { if (!controller.signal.aborted) setTranslationBusy(false); }
  }

  function toggleTranslation() {
    if (translationOpen) { setTranslationOpen(false); return; }
    setTranslationOpen(true);
    if (!translation && !translationBusy) void requestTranslation();
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

  const selectionContext = useCallback((element: HTMLElement) => {
    if (view !== 'video' || busy || editing) return null;
    if (contentKind === 'media') {
      const source = savedMedia?.segments[index];
      if (!source || maskEditing || element !== transcript.current) return null;
      return { language: savedMedia!.language, context: { surface: '', sentence: source.text,
        source: { type: 'media' as const, mediaId: savedMedia!.id, segmentId: source.id, name: savedMedia!.name, start: source.start } } };
    }
    const sentenceIndex = Number(element.dataset.sentenceIndex);
    const sentence = activeArtifact?.sentences[sentenceIndex];
    if (!activeArtifact || !sentence || !element.matches('.artifact-korean')) return null;
    return { language: activeArtifact.language, context: { surface: '', sentence: sentence.parts.map(part => part.text).join(''),
      source: { type: 'artifact' as const, artifactId: activeArtifact.id, sentenceIndex, name: activeArtifact.title } } };
  }, [view, busy, editing, contentKind, savedMedia, index, maskEditing, activeArtifact]);

  const status = <div className="workspace-status">
    {file && (busy ? <><span role="status">正在转写与切句…</span><button onClick={() => { processing.current?.abort(); setBusy(false); }}>取消处理</button></> : <button disabled={!canPlay || editing} onClick={() => void processMedia()}>{segments.length ? '重新处理' : '开始处理 / 重试'}</button>)}
    {savedMedia?.missing && <button onClick={() => void openSaved(savedMedia.id, true)}>重新关联媒体</button>}
  </div>;

  return <div className="workspace-shell">
    <TopNav activeView={view} libraryOpen={libraryOpen} settingsOpen={settingsOpen} onOpenSettings={openSettings} onOpenLibrary={() => { if (allowChange()) setLibraryOpen(true); }} onShowVideo={() => { if (allowChange()) setView('video'); }} onShowVocab={showVocab}/>
    <input className="file-input" ref={picker} type="file" accept="audio/*,video/*,.m4a,.mp3,.mp4,.wav,.webm,.ogg,.flac,.aac,.mov" aria-label="选择音频或视频" onChange={event => { void chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
    {error && <p className="notice workspace-notice" role="alert">{error}</p>}
    <main className="workspace-content-grid" ref={contentGrid} style={{ '--workspace-context-width': contextWidth === undefined ? undefined : `${contextWidth}px` } as CSSProperties} hidden={view !== 'video' || contentKind !== 'media'}>
      <div className="workspace-main-column" ref={mainColumn} style={{ '--workspace-stage-height': stageHeight === undefined ? undefined : `${stageHeight}px`, '--workspace-video-ratio': videoRatio } as CSSProperties}>
        <VideoStage src={src} video={video} name={file?.name ?? ''} mediaRef={el => { media.current = el; }} mediaProps={mediaProps} duration={duration} position={position} onSeek={seek} onVideoDimensions={(width, height) => { if (width > 0 && height > 0) setVideoRatio(width / height); }} status={status} videoMask={videoMask} videoMaskColor={settings.videoMaskColor} maskEditing={videoMaskEditing} onToggleMask={toggleVideoMask} onToggleMaskEditing={toggleVideoMaskEditing} onMaskChange={setVideoMask}/>
        {!file && <button className="workspace-primary-button workspace-start" onClick={() => void importMedia()}>导入媒体</button>}
        <div className="workspace-stage-divider" role="separator" tabIndex={0} aria-label="Resize video and sentence areas" aria-orientation="horizontal" aria-valuemin={140} aria-valuemax={stageSize.max} aria-valuenow={stageSize.height}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
            stageDrag.current = { id: event.pointerId, y: event.clientY, height: measureStage(mainColumn.current).height };
          }}
          onPointerMove={event => {
            const drag = stageDrag.current;
            if (drag?.id === event.pointerId) resizeStage(drag.height + event.clientY - drag.y);
          }}
          onPointerUp={() => { stageDrag.current = null; }} onPointerCancel={() => { stageDrag.current = null; }} onLostPointerCapture={() => { stageDrag.current = null; }}
          onKeyDown={event => {
            if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = measureStage(mainColumn.current);
            resizeStage(event.key === 'Home' ? 140 : event.key === 'End' ? current.max : current.height + (event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 40 : 10));
          }}/>
        <SentenceArea segment={segment} index={index} total={segments.length} language={savedMedia?.language ?? 'ko'} mode={mode} onModeChange={next => { if (next === 'sentence') select(index); else setMode('full'); }} canPlay={canPlay} playing={playing} onPlayPause={() => void play()} onPrevious={() => select(index - 1)} onNext={() => select(index + 1)} maskedGroups={maskedGroups} maskEditing={maskEditing} onToggleMaskEditing={toggleMaskEditing} onToggleGroup={toggleGroup} transcriptRef={transcript} rate={rate} onRateChange={next => { setRate(next); if (media.current) media.current.playbackRate = next; }} loop={loop} onLoopChange={setLoop} translationOpen={translationOpen} translation={translation} translationBusy={translationBusy} translationError={translationError} onToggleTranslation={toggleTranslation} onTranslate={options => void requestTranslation(options)} onCancelTranslation={() => { translating.current?.abort(); setTranslationBusy(false); }}/>
      </div>
      <div className="workspace-context-divider" role="separator" tabIndex={0} aria-label="Resize Context panel" aria-orientation="vertical" aria-valuemin={240} aria-valuemax={contextSize.max} aria-valuenow={contextSize.width}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
          contextDrag.current = { id: event.pointerId, x: event.clientX, width: measureContext(contentGrid.current).width };
        }}
        onPointerMove={event => {
          const drag = contextDrag.current;
          if (drag?.id === event.pointerId) resizeContext(drag.width + drag.x - event.clientX);
        }}
        onPointerUp={() => { contextDrag.current = null; }} onPointerCancel={() => { contextDrag.current = null; }} onLostPointerCapture={() => { contextDrag.current = null; }}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const current = measureContext(contentGrid.current);
          resizeContext(event.key === 'Home' ? 240 : event.key === 'End' ? current.max : current.width + (event.key === 'ArrowLeft' ? 1 : -1) * (event.shiftKey ? 40 : 10));
        }}/>
      <ContextPanel segments={segments} language={savedMedia?.language ?? 'ko'} index={index} onSelect={select} showText={showContext} onToggleText={() => setShowContext(value => !value)}/>
    </main>
    <section className="workspace-story" hidden={view !== 'video' || contentKind !== 'story'} aria-label="Story workspace">
      {desktop && <ArtifactLibrary learning={learningArtifacts} selected={generationTargets} credential={credential} onOpenSettings={openSettings} onBeforeChange={allowChange} onOpenVocabulary={id => void openVocabularyEntry(id)} active={view === 'video' && contentKind === 'story'} generationOpen={generationOpen} onGenerationClose={() => setGenerationOpen(false)} onRequestGenerate={() => requestStory()}/>}
    </section>
    <section className="workspace-vocab" hidden={view !== 'vocab'} aria-label="Vocab workspace">
      {desktop ? <VocabularyNotebook ref={vocabularyNotebook} refreshKey={vocabularyRevision} onOpenSource={openEntrySource} onEditingChange={setEditing} active={view === 'vocab'} onEntriesChange={updateVocabularyEntries} onGenerateStory={requestStory}/> : <p className="workspace-empty">词汇本在 Inflow 桌面应用中可用。</p>}
    </section>
    <LibraryDrawer open={libraryOpen} items={library} currentId={contentKind === 'media' ? savedMedia?.id : null} artifacts={artifacts} currentArtifactId={contentKind === 'story' ? activeArtifact?.id : null} onOpenArtifact={artifact => openStory({ type: 'artifact', artifactId: artifact.id, sentenceIndex: 0, name: artifact.title })} onClose={() => setLibraryOpen(false)} onImport={() => void importMedia()} onOpen={id => void openSaved(id)} onRelink={id => void openSaved(id, true)}/>
    <VocabularySelection ref={vocabularySelection} active={desktop && view === 'video' && (contentKind !== 'media' || !maskEditing) && !busy && !editing && !generationOpen && !libraryOpen && !targetSelectionOpen && !settingsOpen} getContext={selectionContext} onOpen={() => media.current?.pause()} onSaved={() => setVocabularyRevision(value => value + 1)}/>
    {targetSelectionOpen && <StoryTargetsDialog entries={vocabularyEntries} onClose={() => setTargetSelectionOpen(false)} onConfirm={confirmStoryTargets}/>}
    {settingsOpen && <SettingsDialog settings={settings} credential={credential} onSettingsChange={setSettings} onCredentialChange={setCredential} onClose={() => setSettingsOpen(false)}/>}
  </div>;
}
