
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Inter as FontSans } from "next/font/google"
 
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'Connect Now',
  description: 'Simple 1-to-1 video calling web app using WebRTC',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark" style={{ colorScheme: "dark" }}>
      <head>
      </head>
      <body className={cn("font-sans antialiased h-full", fontSans.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
