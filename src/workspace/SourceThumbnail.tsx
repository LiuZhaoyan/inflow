"use client";

import { useEffect, useRef, useState } from 'react';
import { managedMediaUrl, type VocabularyContext } from '@/listening/desktop';

export default function SourceThumbnail({ source }: { source: VocabularyContext['source'] }) {
  const container = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const video = source.type === 'media' && /\.(mp4|webm|mov)$/i.test(source.name);
  useEffect(() => {
    const element = container.current;
    if (!element || !video) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [video]);

  return <span ref={container} className="workspace-source-thumbnail" aria-hidden="true">
    {video && visible && !failed && source.type === 'media' ? <video src={managedMediaUrl(source.mediaId)} muted preload="metadata" onLoadedMetadata={event => {
      const element = event.currentTarget;
      if (Number.isFinite(element.duration)) element.currentTime = Math.min(Math.max(0.01, source.start), Math.max(0, element.duration - 0.1));
    }} onError={() => setFailed(true)}/> : <svg viewBox="0 0 24 24"><path d={source.type === 'artifact' ? 'M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5' : 'M3 6h13v12H3zM16 10l5-3v10l-5-3z'}/></svg>}
    {video && <span className="workspace-thumbnail-play">▸</span>}
  </span>;
}
