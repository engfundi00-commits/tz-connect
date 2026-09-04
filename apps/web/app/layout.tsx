import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TZ Connect Wi-Fi",
    template: "%s | TZ Connect Wi-Fi",
  },
  description:
    "TZ Connect Wi-Fi — high-speed internet hotspot vouchers and network management for Tanzania.",
  applicationName: "TZ Connect Wi-Fi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
