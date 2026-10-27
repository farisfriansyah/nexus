import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "@/styles/globals.css";
import { Figtree } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap"
});


export const metadata: Metadata = {
  title: "Nexus Plant Management",
  description: "Dashboard operasional plant Nexus"
};

const themeScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")==="light"?"light":"dark";document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={figtree.variable} suppressHydrationWarning>
      <body>
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
