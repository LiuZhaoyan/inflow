"use client";

import Image from 'next/image';

export type WorkspaceView = 'video' | 'vocab';

export default function TopNav({
  activeView,
  libraryOpen = false,
  onOpenLibrary,
  onShowVideo,
  onShowVocab,
}: {
  activeView: WorkspaceView;
  libraryOpen?: boolean;
  onOpenLibrary: () => void;
  onShowVideo: () => void;
  onShowVocab: () => void;
}) {
  return <header className="workspace-topnav">
    <div className="workspace-brand"><Image src="/icon.svg" alt="Inflow" width={20} height={20}/></div>
    <nav aria-label="Workspace">
      <button type="button" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={onOpenLibrary}>Library</button>
      <button type="button" aria-current={activeView === 'video' ? 'page' : undefined} aria-label="Video and audio content" onClick={onShowVideo}>Video</button>
      <button type="button" aria-current={activeView === 'vocab' ? 'page' : undefined} onClick={onShowVocab}>Vocab</button>
    </nav>
  </header>;
}
