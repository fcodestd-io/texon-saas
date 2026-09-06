"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowUpRight } from "lucide-react";

interface NavbarProps {
  variant?: "landing" | "auth";
}

export function Navbar({ variant = "landing" }: NavbarProps) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800/80 sticky top-0 z-50 bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-4 group">
          <span className="text-xl font-light tracking-[0.2em] text-neutral-900 dark:text-neutral-100 uppercase">
            TEXON
          </span>
          <span className="text-[10px] font-extralight tracking-widest text-neutral-500 uppercase border-l border-neutral-300 dark:border-neutral-800 pl-4 py-0.5">
            Garment OS
          </span>
        </Link>

        {/* Navigation Items (Only rendered on Landing Page) */}
        {variant === "landing" && (
          <nav className="hidden md:flex items-center gap-10 text-xs tracking-wider font-light text-neutral-600 dark:text-neutral-400">
            <a
              href="#modul"
              className="hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              MODUL SISTEM
            </a>
            <a
              href="#hris"
              className="hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              HRIS & ANALYTICS
            </a>
            <a
              href="#fitur"
              className="hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              KAPABILITAS
            </a>
            <a
              href="#harga"
              className="hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors"
            >
              LISENSI
            </a>
          </nav>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          {variant === "landing" ? (
            <>
              <Link
                href="/login"
                className="text-xs font-light text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors tracking-wider"
              >
                MASUK
              </Link>
              <Link
                href="/login"
                className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors"
              >
                DEMO SISTEM
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="text-xs font-light text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors tracking-wider flex items-center gap-1"
            >
              LANDING PAGE <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
