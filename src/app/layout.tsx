import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PacienteProvider } from '@/app/context/PacienteContext';
import ChatbotN8N from './components/ChatbotN8N';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospital Central",
  description: "Sistema de gestión de citas médicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <AuthProvider>
          <PacienteProvider>

            <main>
              {children}
            </main>
          </PacienteProvider>

          {/* <ChatbotN8N /> */}
        </AuthProvider>
      </body>
    </html>
  );
}