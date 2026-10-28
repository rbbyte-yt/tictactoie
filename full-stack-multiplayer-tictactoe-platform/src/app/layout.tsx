import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "R-T TicTacToe — Online Multiplayer Gaming Platform",
  description: "Play TicTacToe online: bots, friends, ranked matchmaking, R Coins, shop, chests and leaderboards.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
