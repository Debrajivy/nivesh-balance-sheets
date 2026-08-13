import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./comfortable.css";
import "./pwa.css";
import "./actions.css";
import "./auth.css";
import "./logout.css";
import "./demo-login.css";
import "./demo-login-selected.css";
import "./database-records.css";

export const metadata: Metadata = { title: "Nivesh · Family wealth, clearly", description: "A true and fair statement of family assets and liabilities." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f2547" };

export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body>{children}</body></html>; }
