import '@ant-design/v5-patch-for-react-19';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ToastProvider } from '@/components/providers/toast-provider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Weekend - Children's Playground Website",
  description: "子供の遊び場を見つけるための週末ガイド",
  icons: {
    icon: '/images/logo-weekend.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AntdRegistry>
            <ToastProvider />
            {children}
          </AntdRegistry>
        </QueryProvider>
      </body>
    </html>
  );
}
