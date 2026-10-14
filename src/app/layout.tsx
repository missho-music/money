import type { Metadata } from "next";
import { Fredoka, Noto_Sans_TC } from "next/font/google";
import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

const noto = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Classroom Pet Quest",
  description: "香港中學課堂抽籤、寵物金幣與寵物養成平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={`${noto.variable} ${fredoka.variable} antialiased`}>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
