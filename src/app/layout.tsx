import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Inflow', description: 'Import Korean or English media, practice sentence listening and meaning groups, and view Chinese translations.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
