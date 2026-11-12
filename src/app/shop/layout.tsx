import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nook Goods — Studio mug",
  description: "Nook Goods online checkout demo",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
