"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { storage } from "@/lib/storage/StorageAdapter";
import { UserAccount } from "@/types/lms";

const SESSION_USER_KEY = "exam_lms_active_user_v1";

export default function HomeLoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const list = await storage.getUsers();
      setUsers(list);
      const saved = window.sessionStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as UserAccount;
        setCurrentUser(parsed);
      }
    };
    void init();
  }, []);

  const redirectByRole = (user: UserAccount) => {
    window.sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === "OPERATOR") router.push("/operator");
    else if (user.role === "GURU") router.push("/guru");
    else router.push("/murid");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const found = users.find(
      (u) =>
        u.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        u.password === password,
    );
    if (!found) {
      setErrorMsg("Username atau password tidak ditemukan.");
      return;
    }
    redirectByRole(found);
  };

  const handleQuickRoleSwitch = async (role: UserAccount["role"]) => {
    const latestUsers = await storage.getUsers();
    setUsers(latestUsers);
    const match = latestUsers.find((u) => u.role === role);
    if (!match) {
      setErrorMsg(`Akun demo untuk peran ${role} belum tersedia.`);
      return;
    }
    redirectByRole(match);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_USER_KEY);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
  };

  const handleResetDemo = async () => {
    await storage.resetDemoData();
    const fresh = await storage.getUsers();
    setUsers(fresh);
    handleLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form Masuk Standar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Masuk Exam LMS</h1>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan kredensial akun sesuai peran Operator, Guru, atau Murid.
            </p>

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh: operator / guru / alya.xipa1"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {errorMsg && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Masuk ke Sistem
              </button>
            </form>
          </div>

          {/* Akses Cepat Switch Peran untuk Demo */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Switch Peran Cepat (Mode Uji Coba)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Beralih langsung antar tampilan peran untuk menguji alur kerja
                secara end-to-end.
              </p>

              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => void handleQuickRoleSwitch("OPERATOR")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Peran Operator
                    </p>
                    <p className="text-xs text-slate-500">
                      Akun murid, PIN unik, durasi, unlock & rekap spreadsheet
                    </p>
                  </div>
                  <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    OPERATOR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleQuickRoleSwitch("GURU")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Peran Guru
                    </p>
                    <p className="text-xs text-slate-500">
                      Bank soal campuran, kunci jawaban & bobot per butir
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    GURU
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleQuickRoleSwitch("MURID")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Peran Murid
                    </p>
                    <p className="text-xs text-slate-500">
                      Input PIN unik, kerjakan ujian acak & deteksi keluar tab
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    MURID
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Data tersimpan lokal di browser</span>
              <button
                type="button"
                onClick={() => void handleResetDemo()}
                className="font-semibold text-rose-600 hover:underline"
              >
                Reset Data Demo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
