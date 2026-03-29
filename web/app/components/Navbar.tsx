"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWallet from "./ConnectWallet";

const links = [
  { href: "/dashboard", label: "Admin Portfolio" },
  { href: "/marketplace", label: "Market" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-8">
        <Link
          href="/"
          className="font-mono text-[14px] font-bold tracking-tight text-foreground"
        >
          COLLIQUID
        </Link>

        <div className="flex items-center gap-8">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`cursor-pointer text-[14px] transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <ConnectWallet />
        </div>
      </div>
    </nav>
  );
}
