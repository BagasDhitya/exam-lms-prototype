"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserAccount } from "@/types/lms";

interface NavbarProps {
  currentUser: UserAccount | null;
  onLogout: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogoutClick = () => {
    onLogout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-extrabold text-white">
              LMS
            </span>
            <span>Exam LMS</span>
          </Link>

          {currentUser && (
            <nav className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
              {currentUser.role === "OPERATOR" && (
                <Link
                  href="/operator"
                  className={`rounded-lg px-3 py-1.5 transition ${
                    pathname.startsWith("/operator")
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Dashboard Operator
                </Link>
              )}
              {currentUser.role === "GURU" && (
                <Link
                  href="/guru"
                  className={`rounded-lg px-3 py-1.5 transition ${
                    pathname.startsWith("/guru")
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Bank Soal Guru
                </Link>
              )}
              {currentUser.role === "MURID" && (
                <Link
                  href="/murid"
                  className={`rounded-lg px-3 py-1.5 transition ${
                    pathname.startsWith("/murid")
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Portal Ujian Murid
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">
                  {currentUser.fullName}
                </p>
                <p className="text-[11px] font-medium text-indigo-600">
                  Peran: {currentUser.role}
                  {currentUser.className ? ` • ${currentUser.className}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keluar / Ganti Akun
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
