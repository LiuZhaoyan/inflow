import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Inflow · 韩语精听', description: '把一段韩语，慢慢听清。分段听写、渐进提示与弱项复习。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
