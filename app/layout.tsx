import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = { title: 'USTA PRO · Qurilish platformasi', description: 'O‘lchov, materiallar, uy rejasi va qurilish smetasi.' };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uz"><body>{children}</body></html>;
}
