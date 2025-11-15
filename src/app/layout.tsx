import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppDataProvider } from "@/components/AppDataProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccentColorProvider } from "@/components/AccentColorProvider";
import { QueryProvider } from "@/components/QueryProvider";
import { VersionChecker } from "@/components/VersionChecker";
import { SupabaseErrorBoundary } from "@/components/SupabaseErrorBoundary";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "FTC TeamForge",
  description: "Comprehensive team management platform for FTC robotics teams",
  icons: {
    icon: ['/favicon.ico', '/icon.png'],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Disabled react-grab due to toLowerCase error */}
        {/* {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )} */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Get theme preference
                  const theme = localStorage.getItem('ftc-teamforge-theme') || 'system';
                  let resolvedTheme = theme;

                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }

                  // Apply theme class immediately, before any rendering
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolvedTheme);

                  // Disable transitions temporarily to prevent flash
                  root.style.setProperty('--theme-transition', 'none');

                  // Re-enable transitions after a brief delay
                  setTimeout(() => {
                    root.style.removeProperty('--theme-transition');
                  }, 50);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased font-sans`}
      >
        <SupabaseErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <VersionChecker>
                <AppDataProvider>
                  <ThemeProvider>
                    <AccentColorProvider>
                      {children}
                      <Toaster />
                    </AccentColorProvider>
                  </ThemeProvider>
                </AppDataProvider>
              </VersionChecker>
            </AuthProvider>
          </QueryProvider>
        </SupabaseErrorBoundary>
      </body>
    </html>
  );
}