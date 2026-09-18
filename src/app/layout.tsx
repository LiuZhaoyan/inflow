import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Inflow · 韩语精听', description: '导入韩语影音，按句精听、揭晓意群并查看中文译文。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
