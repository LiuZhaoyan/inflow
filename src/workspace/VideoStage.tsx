"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MediaHTMLAttributes, type PointerEvent, type ReactNode, type RefCallback } from 'react';
import { adjustVideoMask, containedVideoBounds, defaultVideoMaskColor, type MaskHandle, type PictureBounds, type VideoMask } from '@/listening/video-mask';

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
  onVideoDimensions,
  status,
  videoMask,
  videoMaskColor = defaultVideoMaskColor,
  maskEditing,
  onToggleMask,
  onToggleMaskEditing,
  onMaskChange,
}: {
  src: string;
  video: boolean;
  name: string;
  mediaRef: RefCallback<HTMLMediaElement>;
  mediaProps: Omit<MediaHTMLAttributes<HTMLMediaElement>, 'src'>;
  duration: number;
  position: number;
  onSeek: (time: number) => void;
  onVideoDimensions?: (width: number, height: number) => void;
  status?: ReactNode;
  videoMask?: VideoMask;
  videoMaskColor?: string;
  maskEditing: boolean;
  onToggleMask: () => void;
  onToggleMaskEditing: () => void;
  onMaskChange: (mask: VideoMask) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const videoElement = useRef<HTMLVideoElement>(null);
  const maskElement = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; handle: MaskHandle; x: number; y: number; mask: VideoMask; width: number; height: number } | null>(null);
  const [picture, setPicture] = useState<{ src: string; bounds: PictureBounds | null } | null>(null);
  const updatePicture = useCallback(() => {
    const box = stage.current, element = videoElement.current;
    if (box && element) setPicture({ src, bounds: containedVideoBounds(box.clientWidth, box.clientHeight, element.videoWidth, element.videoHeight) });
  }, [src]);
  useEffect(() => {
    if (!video || !stage.current) return;
    const observer = new ResizeObserver(updatePicture);
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [video, updatePicture]);
  const bounds = picture?.src === src ? picture.bounds : null;

  function startDrag(event: PointerEvent<HTMLElement>, handle: MaskHandle) {
    if (!maskEditing || !videoMask || !bounds || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    maskElement.current?.focus(); maskElement.current?.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, handle, x: event.clientX, y: event.clientY, mask: videoMask, width: bounds.width, height: bounds.height };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!maskEditing || !current || current.id !== event.pointerId) return;
    onMaskChange(adjustVideoMask(current.mask, current.handle, (event.clientX - current.x) / current.width, (event.clientY - current.y) / current.height));
  }
  function adjustWithKeyboard(event: KeyboardEvent<HTMLElement>, handle: MaskHandle) {
    if (!maskEditing || !videoMask || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 0.05 : 0.01;
    onMaskChange(adjustVideoMask(videoMask, handle, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0));
  }
  const value = Math.max(0, Math.min(position, duration || 0));
  const progress = duration ? value / duration * 100 : 0;

  return <section className="workspace-video-stage-wrap" aria-label="Media player">
    <div className="workspace-video-stage" ref={stage}>
      {src && video ? <video ref={element => { videoElement.current = element; mediaRef(element); }} {...mediaProps} src={src} playsInline aria-label={name || 'Video player'}
        onLoadedMetadata={event => {
          updatePicture();
          onVideoDimensions?.(event.currentTarget.videoWidth, event.currentTarget.videoHeight);
          mediaProps.onLoadedMetadata?.(event);
        }}
        onResize={updatePicture}/> : src ? <>
        <audio ref={mediaRef} {...mediaProps} src={src} className="workspace-audio-element" aria-hidden="true" tabIndex={-1}/>
        <div className="workspace-audio-card" aria-label={`Audio: ${name}`} role="img">
          <div className="workspace-audio-orbit" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg></div>
          <span title={name}>{name || 'Audio'}</span>
        </div>
      </> : <div className="workspace-stage-empty">
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="9" width="54" height="46" rx="8"/><path d="m27 22 15 10-15 10z"/></svg>
        <strong>Your next listening session</strong><span>Import audio or video, then take it one sentence at a time.</span>
      </div>}
      {src && video && videoMask?.enabled && bounds && <div className="workspace-video-picture" style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}>
        <div ref={maskElement} className={`workspace-video-mask${maskEditing ? ' is-adjusting' : ''}`}
          style={{ left: `${videoMask.x * 100}%`, top: `${videoMask.y * 100}%`, width: `${videoMask.width * 100}%`, height: `${videoMask.height * 100}%`, backgroundColor: videoMaskColor }}
          role={maskEditing ? 'group' : undefined} aria-label={maskEditing ? 'Move subtitle mask' : undefined} tabIndex={maskEditing ? 0 : undefined}
          onClick={event => event.stopPropagation()} onPointerDown={event => startDrag(event, 'move')} onPointerMove={moveDrag}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
          onKeyDown={event => adjustWithKeyboard(event, 'move')}>
          {maskEditing && (['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map(handle => <button key={handle} type="button"
            className={`workspace-video-mask-handle handle-${handle}`} aria-label={`Resize subtitle mask ${handle}`}
            onPointerDown={event => startDrag(event, handle)} onKeyDown={event => adjustWithKeyboard(event, handle)}/>)}
        </div>
      </div>}
    </div>
    <div className="workspace-progress">
      <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(value, duration || 1)} disabled={!src || !duration} aria-label="Playback position"
        style={{ background: `linear-gradient(90deg, var(--workspace-accent) ${progress}%, var(--workspace-line) ${progress}%)` }}
        onChange={event => onSeek(Number(event.target.value))}/>
      <span className="workspace-timecode">{formatTime(value)} <span aria-hidden="true">/</span> {formatTime(duration)}</span>
    </div>
    {status && <div className="workspace-stage-status">
      {src && video && <div className="workspace-video-mask-controls">
        <button type="button" aria-label="Hide video subtitles" aria-pressed={videoMask?.enabled ?? false} onClick={onToggleMask}>遮挡字幕</button>
        {videoMask?.enabled && <button type="button" aria-label={maskEditing ? 'Finish subtitle mask adjustment' : 'Adjust subtitle mask'} aria-pressed={maskEditing} onClick={onToggleMaskEditing}>{maskEditing ? '完成调整' : '调整区域'}</button>}
        {maskEditing && <span>拖动区域移动，拖动边缘调整大小；方向键可微调，播放后可实时调整。</span>}
      </div>}
      {status}
    </div>}
  </section>;
}
