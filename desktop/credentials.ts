import { safeStorage } from 'electron';
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
import type { CredentialStatus } from '../src/listening/desktop';

export class GenerationCredential {
  private key = '';
  private error = '';
  private filename: string;

  constructor(directory: string) { this.filename = path.join(directory, 'deepseek.key'); }

  async initialize(root: string): Promise<void> {
    if (existsSync(this.filename)) {
      try { this.key = safeStorage.decryptString(await readFile(this.filename)); }
      catch { this.error = '无法解密保存的密钥，请重新配置。'; }
      return;
    }
    let key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      for (const file of ['.env', '.env.local']) {
        const filename = path.join(root, file);
        if (existsSync(filename)) key = parseEnv(await readFile(filename, 'utf8')).DEEPSEEK_API_KEY || key;
      }
    }
    if (key) {
      try { await this.configure(key); }
      catch { this.error = '无法保存本地密钥，请检查 Windows 加密状态或重新配置。'; }
    }
  }

  status(): CredentialStatus { return { configured: !!this.key, ...(this.error ? { error: this.error } : {}) }; }
  get(): string { return this.key; }

  async configure(value: string): Promise<CredentialStatus> {
    if (typeof value !== 'string' || !value.trim() || value.length > 512 || /[\r\n\0]/u.test(value)) throw new Error('请输入有效的 DeepSeek API key。');
    if (process.platform !== 'win32' || !safeStorage.isEncryptionAvailable()) throw new Error('Windows 凭据加密不可用，密钥未保存。');
    const key = value.trim();
    const temporary = this.filename + '.tmp';
    try {
      await writeFile(temporary, safeStorage.encryptString(key));
      await rename(temporary, this.filename);
      this.key = key; this.error = '';
    } catch { throw new Error('密钥加密保存失败，请重试。'); }
    finally { await rm(temporary, { force: true }); }
    return this.status();
  }
}
