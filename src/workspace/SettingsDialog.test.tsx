import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LocaleProvider } from '@/i18n/context';
import type { DesktopBridge, ModelStatus } from '@/listening/desktop';
import SettingsDialog from '@/workspace/SettingsDialog';

const methods = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
};

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
});

afterEach(() => {
  cleanup();
  delete window.inflow;
  for (const [name, descriptor] of Object.entries(methods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

test.each([
  ['en', 'Processing models', 'Prepare or repair models'],
  ['zh-CN', '处理模型', '准备或修复模型'],
] as const)('offers model repair in %s', async (locale, category, action) => {
  const settings = { videoMaskColor: '#000000', interfaceLocale: locale };
  const incomplete: ModelStatus = { whisper: false, translate: { 'ko-en': false, 'en-zh': true }, englishParser: true };
  const host = {
    getSettings: vi.fn().mockResolvedValue(settings),
    modelStatus: vi.fn().mockResolvedValue(incomplete),
    setupModels: vi.fn().mockResolvedValue({ whisper: true, translate: { 'ko-en': true, 'en-zh': true }, englishParser: true }),
  };
  window.inflow = host as unknown as DesktopBridge;
  render(<LocaleProvider><SettingsDialog settings={settings} credential={{ configured: false }} onSettingsChange={() => {}} onCredentialChange={() => {}} onClose={() => {}}/></LocaleProvider>);

  fireEvent.click(await screen.findByRole('button', { name: category }));
  fireEvent.click(await screen.findByRole('button', { name: action }));
  await waitFor(() => expect(host.setupModels).toHaveBeenCalledWith(expect.any(String), ['whisper', 'translate']));
  await waitFor(() => expect(document.querySelectorAll('#settings-models-panel [data-state="ready"]')).toHaveLength(4));
});
