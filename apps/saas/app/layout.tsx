import { geistMono, geistSans } from "@repo/design/base/fonts";
import "@repo/design/globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import "./global.css";

export const metadata: Metadata = {
  title: "RagRabbit - Admin Dashboard",
  description: "RagRabbit - Admin Dashboard",
  icons: {
    icon: [{ rel: "icon", url: "/logo_small.svg", sizes: "any", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
