"use client";

import Link from "next/link";
import Image from "next/image";

type SiteHeaderProps = {
  rightContent?: React.ReactNode;
};

export function SiteHeader({ rightContent }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1000px] flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CTFploy home">
          <Image src="/logos/logo-transparent-dark.png" alt="" width={34} height={34} className="h-[34px] w-[34px] shrink-0" priority />
          <span className="text-lg font-semibold tracking-tight header-wordmark">
            CTFploy
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          {rightContent}
        </nav>
      </div>
    </header>
  );
}
