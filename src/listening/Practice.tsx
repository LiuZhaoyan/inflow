"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import RevealMenu from './RevealMenu';
import { revealedGroupCount, type RevealChoice } from './reveal';
import { validateSegments, type Segment } from './processing';

const clock = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function Practice() {
  const media = useRef<HTMLMediaElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const processing = useRef<AbortController | null>(null);
  const translating = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
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

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { processing.current?.abort(); translating.current?.abort(); }, []);
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

  function hideText() {
    setReveal(null); setTranslationOpen(false); setTranslation(''); setTranslationError(''); setTranslationBusy(false);
    translating.current?.abort();
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
      const form = new FormData(); form.append('file', file);
      const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '处理失败，请重试。');
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

  return <main className="listening-page">
    <header className="masthead">
      <Link className="home-link" href="/" aria-label="返回首页">‹</Link>
      <div className="brand"><div><span>Inflow</span><Image src="/icon.svg" alt="" width={36} height={36}/></div><p>让好内容，成为你的外语老师</p></div>
      <button className="import-icon" onClick={() => picker.current?.click()} aria-label="导入媒体">＋</button>
    </header>
    <input className="file-input" ref={picker} type="file" accept="audio/*,video/*,.m4a,.mp3,.mp4,.wav,.webm,.ogg,.flac,.aac,.mov" aria-label="选择音频或视频" onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ''; }}/>
    <section className="media-card" aria-label="媒体播放器">
      {src && video ? <video key={src} ref={el => { media.current = el; }} {...mediaProps} playsInline onClick={() => void play()} aria-label="视频播放器"/> : <>
        {src && <audio key={src} ref={el => { media.current = el; }} {...mediaProps} aria-label="音频播放器"/>}
        <div className="audio-art"><div className="sun" aria-hidden="true">☀</div><div className="soundwave" aria-hidden="true">{[18,36,58,82,48,68,94,54,36,62,24].map((height,n) => <i key={n} style={{ height }}/> )}</div><h1>{file ? '听见每一句' : '从一段喜欢的声音开始'}</h1><p>{file ? '先听，再慢慢揭晓。' : '导入韩语音频或视频，开启精听。'}</p>{!file && <button className="primary" onClick={() => picker.current?.click()}>选择媒体 ＋</button>}</div>
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
    <div className="import-status"><span title={file?.name}>{file?.name || '支持音频与视频 · 50 MB / 10 分钟以内'}</span>{file && <button className="process-button" disabled={!duration || duration > 600 || busy} onClick={() => void processMedia()}>{busy ? '正在转写与切句…' : segments.length ? '重新处理' : '开始处理'}</button>}</div>
    <p className="processing-note">媒体在当前 Inflow 服务上处理，不发送至第三方。{busy ? '处理期间仍可试听。' : '自动结果可能有误。'}</p>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="transport"><button disabled={!segment || index===0} onClick={() => select(index-1)}>◀Ⅰ <span>上一句</span></button>
      <RevealMenu key={`${src}-${index}`} disabled={!segment} onSelect={selectReveal}/>
      <button disabled={!segment || index===segments.length-1} onClick={() => select(index+1)}><span>下一句</span> Ⅰ▶</button></div>
    <section className="transcript" aria-label="当前句原文" aria-live="polite">
      <div className="sentence-meta"><span>{segment ? `第 ${index+1} / ${segments.length} 句 · ${clock(segment.start)}–${clock(segment.end)}` : '当前句'}</span>{reveal && <button onClick={() => setReveal(null)}>隐藏原文</button>}</div>
      {segment ? <p lang="ko">{segment.groups.map((group,n) => <span key={n} className={reveal && n < revealedGroupCount(segment.groups,reveal) ? 'meaning-group' : 'hidden-group'}>{reveal && n < revealedGroupCount(segment.groups,reveal) ? group : <span aria-label="未揭晓意群">•••</span>}{' '}</span>)}</p> : <p className="empty-text">{busy ? '正在听清每一句…' : '处理媒体后，从这里揭晓原文'}</p>}
    </section>
    <div className="tools"><label><select aria-label="播放倍速" value={rate} onChange={event => { const next = Number(event.target.value); setRate(next); if (media.current) media.current.playbackRate = next; }}>{[0.5,0.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{value}×</option>)}</select><span>倍速</span></label>
      <button disabled={!segment} aria-pressed={loop} onClick={() => setLoop(value => !value)}><span className="tool-symbol" aria-hidden="true">↻</span><span>{loop ? '循环中' : '循环'}</span></button>
      <button disabled={!segment} aria-expanded={translationOpen} onClick={() => void toggleTranslation()}><span className="translate-symbol" aria-hidden="true">文ᴬ</span><span>翻译</span></button></div>
    <section className={`translation ${translationOpen ? 'expanded' : ''}`} aria-label="当前句译文" aria-live="polite">
      {translationOpen ? <><div className="translation-heading"><span>中文译文</span><button onClick={() => setTranslationOpen(false)} aria-label="收起译文">收起 ×</button></div><p>{translationBusy ? '正在生成译文…' : translationError || translation}</p></> : <button disabled={!segment} onClick={() => void toggleTranslation()}><span aria-hidden="true">☼</span> 按需查看这一句的意思 <span aria-hidden="true">›</span></button>}
    </section>
    <p className="footer-note">一次听清一点。<br/>长按 reveal 滑动选择；也可点击展开。</p>
  </main>;
}
