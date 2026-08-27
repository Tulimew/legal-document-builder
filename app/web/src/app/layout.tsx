import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Hệ thống hỗ trợ xây dựng VBQPPL", template: "%s | Hệ thống hỗ trợ xây dựng VBQPPL" },
  description: "Nguyên mẫu giao diện hệ thống hỗ trợ xây dựng văn bản quy phạm pháp luật",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
