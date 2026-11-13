import type { Metadata } from "next";
import "./globals.css";
import "@near-wallet-selector/modal-ui/styles.css";

export const metadata: Metadata = {
  title: "Folio — Business Console",
  description: "Manage business payments, wallets, and NEAR intent routes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
