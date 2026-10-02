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
    <div className="workspace-brand"><Image src="/icon.svg" alt="" width={32} height={32}/><span>Inflow</span></div>
    <nav aria-label="Workspace">
      <button type="button" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={onOpenLibrary}>Library</button>
      <button type="button" aria-current={activeView === 'video' ? 'page' : undefined} onClick={onShowVideo}>Content</button>
      <button type="button" aria-current={activeView === 'vocab' ? 'page' : undefined} onClick={onShowVocab}>Vocab</button>
    </nav>
  </header>;
}
