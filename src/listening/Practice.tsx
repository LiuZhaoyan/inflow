'use client';

/* Browser storage is an external system: restore once after hydration and report write failures. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import lesson from './lesson.json';
import { assess, compare, freshAttempt, normalize, restore, type Attempt, type Progress, type Rating } from './practice';

const STORAGE_KEY = 'inflow:listening:v1';
const ratings: [Rating, string][] = [['unclear', '还没听懂'], ['partial', '大致理解'], ['clear', '完全理解']];
const blank = (): Progress => ({ version: 1, lesson: lesson.id, index: 0, phase: 'listen', impression: '', items: {} });
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function Practice() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [notice, setNotice] = useState('');
  const [audioError, setAudioError] = useState('');
  const [mode, setMode] = useState<'whole' | 'segment'>('whole');
  const [loop, setLoop] = useState(false);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const audio = useRef<HTMLAudioElement>(null);
  const index = progress?.index ?? 0;
  const segment = lesson.segments[index];
  const item = progress?.items[segment.id] ?? freshAttempt();

  useEffect(() => {
    let next = blank();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? restore(raw) : null;
      if (saved && saved.lesson === lesson.id && saved.index < lesson.segments.length) next = saved;
      else if (raw) setNotice('旧记录无法读取，已开启新的练习。');
    } catch { setNotice('浏览器未允许本地存储，本次进度无法保存。'); }
    // Restore browser-only state after hydration; never overwrite saved progress with server defaults.
    setProgress(next);
  }, []);

  useEffect(() => {
    if (!progress) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch { setNotice('保存失败：请检查浏览器存储空间。本次练习仍可继续。'); }
  }, [progress]);

  function updateItem(patch: Partial<Attempt>) {
    setProgress(p => p ? { ...p, items: { ...p.items, [segment.id]: { ...(p.items[segment.id] ?? freshAttempt()), ...patch } } } : p);
  }

  function countPlay() {
    setProgress(p => {
      if (!p) return p;
      const current = p.items[segment.id] ?? freshAttempt();
      return { ...p, items: { ...p.items, [segment.id]: { ...current, plays: current.plays + 1 } } };
    });
  }

  async function play(target: 'whole' | 'segment') {
    const el = audio.current;
    if (!el) return;
    setAudioError('');
    setMode(target);
    el.currentTime = target === 'whole' ? 0 : segment.start;
    el.playbackRate = rate;
    try { await el.play(); }
    catch { setAudioError('音频暂时无法播放，请检查素材文件后重试。'); }
  }

  useEffect(() => {
    const el = audio.current;
    if (!el || !playing || mode !== 'segment') return;
    let frame = 0;
    const constrain = () => {
      if (el.currentTime < segment.start) el.currentTime = segment.start;
      if (el.currentTime >= segment.end) {
        if (loop) {
          el.currentTime = segment.start;
          setProgress(p => {
            if (!p) return p;
            const previous = p.items[segment.id] ?? freshAttempt();
            return { ...p, items: { ...p.items, [segment.id]: { ...previous, plays: previous.plays + 1 } } };
          });
          void el.play().catch(() => setAudioError('循环播放中断，请再次播放。'));
        } else { el.pause(); el.currentTime = segment.end; }
      }
    };
    const tick = () => { constrain(); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    el.addEventListener('timeupdate', constrain);
    return () => { cancelAnimationFrame(frame); el.removeEventListener('timeupdate', constrain); };
  }, [playing, mode, segment, loop]);

  function select(next: number) {
    audio.current?.pause();
    setMode('segment');
    setProgress(p => p ? { ...p, index: next, phase: 'practice' } : p);
  }

  function record(rating: Rating) {
    if (item.score === null || item.submitted === null) return;
    const status = assess(item.score, item.hint, rating);
    updateItem({ rating, status, due: now + (status === 'independent' ? 3 : 1) * 86400000 });
  }

  function retry(next: number) {
    select(next);
    const id = lesson.segments[next].id;
    setProgress(p => {
      if (!p) return p;
      const previous = p.items[id] ?? freshAttempt();
      return { ...p, items: { ...p.items, [id]: { ...freshAttempt(), notes: previous.notes, plays: previous.plays, status: 'review', due: previous.due } } };
    });
  }

  if (!progress) return <main className="loading">正在打开 Inflow…</main>;
  const completed = lesson.segments.filter(s => progress.items[s.id]?.rating).length;
  const review = lesson.segments.filter(s => {
    const saved = progress.items[s.id];
    return saved && (saved.status === 'review' || (saved.due !== null && saved.due <= now));
  });
  const result = item.submitted !== null ? compare(item.submitted, segment.text) : null;
  const characters = Array.from(normalize(segment.text));

  return <div className="shell">
    <header><Link className="brand" href="/"><Image src="/icon.svg" width={34} height={34} alt="" />Inflow<span>韩语精听</span></Link><span className="local-badge">本地学习 · 无需 AI</span></header>
    <main>
      <section className="intro"><p className="eyebrow">LISTEN CLOSELY. LEARN SLOWLY.</p><h1>把一段韩语，<br />慢慢听清。</h1><p>先听，再写。卡住时只揭开一点提示，按自己的节奏理解每一句。</p></section>
      {notice && <p role="status" className="notice">{notice}</p>}
      <div className="workspace">
        <aside className="library">
          <p className="eyebrow">你的素材</p><h2>{lesson.title}</h2><p>{lesson.description}</p>
          <div className="tags"><span>韩语 · 入门</span><span>{time(lesson.duration)}</span><span>{lesson.segments.length} 个片段</span></div>
          <progress aria-label="学习进度" value={completed} max={lesson.segments.length} /><p className="muted">已完成听写与自评 {completed} / {lesson.segments.length}</p>
          <button className={progress.phase === 'listen' ? 'selected' : ''} onClick={() => { audio.current?.pause(); setMode('whole'); setProgress({ ...progress, phase: 'listen' }); }}>整段盲听</button>
          <nav aria-label="片段列表">{lesson.segments.map((s, n) => <button key={s.id} className={progress.phase === 'practice' && n === index ? 'selected' : ''} onClick={() => select(n)}><span>片段 {String(n + 1).padStart(2, '0')} <small>{time(s.start)} – {time(s.end)}</small></span><span>{progress.items[s.id]?.status === 'independent' ? '✓' : progress.items[s.id]?.rating ? '↻' : '·'}</span></button>)}</nav>
          <details><summary>素材来源与使用说明</summary><p>{lesson.source.note}</p><a href={lesson.source.url} target="_blank" rel="noreferrer">查看原始课程 ↗</a><p><a href={lesson.source.textUrl} target="_blank" rel="noreferrer">教材原文（含答案）↗</a></p><p>{lesson.source.rights}</p></details>
        </aside>
        <section className="practice">
          <div className="section-heading"><div><p className="eyebrow">{progress.phase === 'listen' ? '01 / 整段盲听' : '02 / 分段精听'}</p><h2>{progress.phase === 'listen' ? '先听听看，不急着看答案' : `片段 ${String(index + 1).padStart(2, '0')}`}</h2></div><span className="muted">{progress.phase === 'practice' ? `${item.plays} 次片段播放` : '先建立整体印象'}</span></div>
          <div className="player"><audio ref={audio} controls preload="metadata" src={lesson.audio} onPlay={() => { if (audio.current && mode === 'segment' && audio.current.currentTime >= segment.end) audio.current.currentTime = segment.start; if (mode === 'segment') countPlay(); setPlaying(true); }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setAudioError('素材音频加载失败，请检查本地文件并刷新。')} aria-label="韩语素材播放器" />
            <div className="controls"><button className="primary" onClick={() => void play(progress.phase === 'listen' ? 'whole' : 'segment')}>{progress.phase === 'listen' ? '从头播放整段' : '重播本片段'}</button><label>语速 <select value={rate} onChange={e => { const speed = Number(e.target.value); setRate(speed); if (audio.current) audio.current.playbackRate = speed; }}>{[0.6, 0.8, 1, 1.2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>{progress.phase === 'practice' && <label><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> 循环本片段</label>}</div>
            {audioError && <p role="alert">{audioError}</p>}
          </div>
          {progress.phase === 'listen' ? <div className="stage"><h3>你听懂了多少？</h3><p className="muted">这是你的第一印象，不是考试成绩。暂时听不清也可以继续。</p><div className="choices">{['少量词语', '大致意思', '基本都懂'].map(value => <button aria-pressed={progress.impression === value} key={value} className={progress.impression === value ? 'selected' : ''} onClick={() => setProgress({ ...progress, impression: value })}>{value}</button>)}</div><button className="primary" onClick={() => select(index)}>开始分段听写 →</button></div> : <>
            <form className="stage" onSubmit={e => { e.preventDefault(); const checked = compare(item.text, segment.text); updateItem({ submitted: item.text, score: checked.score, rating: '', status: 'new', due: null }); }}>
              <label className="input-label" htmlFor="dictation">写下你听到的韩语</label><p className="muted">不确定的地方可以留空。先尝试，再获取提示。</p><textarea id="dictation" lang="ko" placeholder="在这里输入听到的内容…" value={item.text} maxLength={500} onChange={e => updateItem({ text: e.target.value, submitted: null, score: null, rating: '', status: 'new', due: null })} spellCheck={false} autoComplete="off" />
              <button className="primary" type="submit">{item.text.trim() ? '检查听写' : '暂时听不出，提交空白'}</button>
            </form>
            {result && <section className="feedback" aria-live="polite"><h3>本次听写匹配 {result.score}%</h3><p className="muted">忽略空格、标点；不等于理解程度。错误只标出位置，不提前显示答案。</p><div className="diff" lang="ko">{result.parts.map((part, n) => <span key={n} className={part.kind} title={{ correct: '正确', missing: '遗漏', extra: '多写', wrong: '待确认' }[part.kind]}>{part.text}</span>)}</div><p className="legend">正常文字：正确 · □：遗漏 · 下划线：待确认 · 删除线：多写</p>
              <button onClick={() => updateItem({ hint: Math.min(item.hint + 1, 4), status: item.rating ? 'review' : 'new', due: item.rating ? now + 86400000 : null })} disabled={item.hint === 4}>{['提示 1：字数', '提示 2：部分字符', '提示 3：完整原文', '提示 4：中文意思', '已显示全部提示'][item.hint]}</button>
              {item.hint >= 1 && <p>共 {characters.length} 个韩文字块（不含空格、标点）。</p>}
              {item.hint === 2 && <p className="korean" lang="ko">{characters.map((c, n) => n % 3 === 0 ? c : '□').join(' ')}</p>}
              {item.hint >= 3 && <p className="korean" lang="ko">{segment.text}</p>}
              {item.hint >= 4 && <p>{segment.translation}</p>}
              <div className="understanding"><h3>现在理解句子的意思了吗？</h3><div className="choices">{ratings.map(([value, label]) => <button key={value} aria-pressed={item.rating === value} className={item.rating === value ? 'selected' : ''} onClick={() => record(value)}>{label}</button>)}</div>{item.rating && <p role="status">{item.status === 'independent' ? '本次无提示听写正确且自评理解，3 天后再检验。' : '已记入薄弱片段，明天复习；也可以现在再练。'}</p>}</div>
            </section>}
            <section className="notes"><label className="input-label" htmlFor="notes">自己的理解笔记</label><p className="muted">查词、梳理句子结构，把卡住你的地方记下来。<a href="https://krdict.korean.go.kr/chn/mainAction" target="_blank" rel="noreferrer">国立国语院韩中词典 ↗</a></p><textarea id="notes" placeholder="我没听清的地方 / 生词 / 语法…" value={item.notes} maxLength={4000} onChange={e => updateItem({ notes: e.target.value })} /></section>
            <div className="navigation"><button disabled={index === 0} onClick={() => select(index - 1)}>← 上一片段</button><button disabled={index === lesson.segments.length - 1} onClick={() => select(index + 1)}>下一片段 →</button></div>
          </>}
        </section>
      </div>
      <section className="review"><div><p className="eyebrow">KEEP IT FAMILIAR</p><h2>值得再听一次</h2><p className="muted">薄弱片段随时可练；到期片段重新盲听。重新练习会清空该片段听写与提示，保留笔记。</p></div>{review.length ? <div className="review-list">{review.map(s => <button key={s.id} onClick={() => retry(lesson.segments.indexOf(s))}>片段 {lesson.segments.indexOf(s) + 1} · {progress.items[s.id].due && progress.items[s.id].due! <= now ? '已到复习时间' : '提前再练'} ↻</button>)}</div> : <p>暂时没有待练片段。继续学习，系统会记录需要复习的地方。</p>}</section>
      {completed === lesson.segments.length && <section className="complete"><h2>这份素材已经逐段走完了。</h2><p>可以自行跟读、背诵或原速复述。这里记录的是听写和理解自评，不代表已经长期掌握。</p><button onClick={() => { setProgress({ ...progress, phase: 'listen' }); void play('whole'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>回听完整素材</button></section>}
    </main><footer>Inflow · 一次听清一点。<span>进度仅保存在当前浏览器，清理浏览器数据会丢失。</span></footer>
  </div>;
}
