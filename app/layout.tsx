import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'RelNet Console · ReLead', template: '%s · ReLead' },
  description: 'RelNet Console: red privada, identidad, facturación, API y MCP.',
  metadataBase: new URL('https://console.relead.com.mx'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
