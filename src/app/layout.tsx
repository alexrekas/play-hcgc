import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { ProfileProvider } from "@/lib/profileContext";
import { ThemeProvider } from "@/lib/themeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Play HCGC – Herndon Centennial Golf Course",
  description: "Simulate a round at Herndon Centennial Golf Course from anywhere.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-app text-app min-h-screen`}>
        <ThemeProvider>
          <AuthProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
