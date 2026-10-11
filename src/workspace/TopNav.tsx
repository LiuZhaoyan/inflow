"use client";

import Image from 'next/image';
import { useLocale } from '@/i18n/context';

export type WorkspaceView = 'video' | 'vocab';

export default function TopNav({
  activeView,
  libraryOpen = false,
  settingsOpen = false,
  onOpenSettings,
  onOpenLibrary,
  onShowVideo,
  onShowVocab,
}: {
  activeView: WorkspaceView;
  libraryOpen?: boolean;
  settingsOpen?: boolean;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onShowVideo: () => void;
  onShowVocab: () => void;
}) {
  const { t } = useLocale();
  return <header className="workspace-topnav">
    <div className="workspace-brand"><Image src="/icon.svg" alt="" width={32} height={32}/><span>Inflow</span></div>
    <nav aria-label={t("Workspace")}>
      <button type="button" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={onOpenLibrary}>{t("Library")}</button>
      <button type="button" aria-current={activeView === 'video' ? 'page' : undefined} onClick={onShowVideo}>{t("Content")}</button>
      <button type="button" aria-current={activeView === 'vocab' ? 'page' : undefined} onClick={onShowVocab}>{t("Vocab")}</button>
    </nav>
    <nav className="workspace-settings-nav" aria-label={t("Application")}>
      <button type="button" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={onOpenSettings}>{t("Settings")}</button>
    </nav>
  </header>;
}
