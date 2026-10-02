"use client";

import type { MediaHTMLAttributes, ReactNode, RefCallback } from 'react';

const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function VideoStage({
  src,
  video,
  name,
  mediaRef,
  mediaProps,
  duration,
  position,
  onSeek,
  status,
}: {
  src: string;
  video: boolean;
  name: string;
  mediaRef: RefCallback<HTMLMediaElement>;
  mediaProps: Omit<MediaHTMLAttributes<HTMLMediaElement>, 'src'>;
  duration: number;
  position: number;
  onSeek: (time: number) => void;
  status?: ReactNode;
}) {
  const value = Math.max(0, Math.min(position, duration || 0));
  const progress = duration ? value / duration * 100 : 0;

  return <section className="workspace-video-stage-wrap" aria-label="Media player">
    <div className="workspace-video-stage">
      {src && video ? <video ref={mediaRef} {...mediaProps} src={src} playsInline aria-label={name || 'Video player'}/> : src ? <>
        <audio ref={mediaRef} {...mediaProps} src={src} className="workspace-audio-element" aria-hidden="true" tabIndex={-1}/>
        <div className="workspace-audio-card" aria-label={`Audio: ${name}`} role="img">
          <div className="workspace-audio-orbit" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg></div>
          <span title={name}>{name || 'Audio'}</span>
        </div>
      </> : <div className="workspace-stage-empty">
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="9" width="54" height="46" rx="8"/><path d="m27 22 15 10-15 10z"/></svg>
        <strong>Your next listening session</strong><span>Import audio or video, then take it one sentence at a time.</span>
      </div>}
    </div>
    <div className="workspace-progress">
      <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(value, duration || 1)} disabled={!src || !duration} aria-label="Playback position"
        style={{ background: `linear-gradient(90deg, var(--workspace-accent) ${progress}%, var(--workspace-line) ${progress}%)` }}
        onChange={event => onSeek(Number(event.target.value))}/>
      <span className="workspace-timecode">{formatTime(value)} <span aria-hidden="true">/</span> {formatTime(duration)}</span>
    </div>
    {status && <div className="workspace-stage-status">{status}</div>}
  </section>;
}
