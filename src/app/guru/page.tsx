"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import QuestionBankEditor from "@/components/guru/QuestionBankEditor";
import { storage } from "@/lib/storage/StorageAdapter";
import { ExamPackage, UserAccount } from "@/types/lms";

const SESSION_USER_KEY = "exam_lms_active_user_v1";

export default function GuruPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>("pkg-geo-1");
  const [showPreview, setShowPreview] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed = JSON.parse(raw) as UserAccount;
    if (parsed.role !== "GURU") {
      router.push("/");
      return;
    }
    setCurrentUser(parsed);

    const loadPkgs = async () => {
      const list = await storage.getPackages();
      setPackages(list);
      if (list[0]) setSelectedPkgId(list[0].id);
    };
    void loadPkgs();
  }, [router]);

  const activePackage =
    packages.find((p) => p.id === selectedPkgId) ?? packages[0];

  const handleSavePackage = async (updated: ExamPackage) => {
    await storage.savePackage(updated);
    const refreshed = await storage.getPackages();
    setPackages(refreshed);
    setSavedNotice("Perubahan bank soal, kunci jawaban, dan bobot tersimpan.");
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_USER_KEY);
    router.push("/");
  };

  if (!currentUser || !activePackage) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bank Soal & Bobot Nilai (Guru)
            </h1>
            <p className="text-sm text-slate-500">
              Kelola soal campuran, pisahkan kolom soal dan kunci jawaban, serta
              atur bobot nilai per butir.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPkgId}
              onChange={(e) => setSelectedPkgId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="rounded-lg border border-indigo-600 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              {showPreview ? "Tutup Pratinjau" : "Pratinjau Paket Soal"}
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
            <span>{savedNotice}</span>
            <button
              type="button"
              onClick={() => setSavedNotice(null)}
              className="rounded bg-emerald-200/70 px-2 py-0.5 font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {showPreview && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-900">
              Pratinjau Tampilan Soal Murid — {activePackage.title}
            </h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-800">
              {activePackage.questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-slate-800">
                      Soal #{q.number} ({q.type})
                    </span>
                    <span className="font-mono font-semibold text-indigo-700">
                      Bobot: {q.weight}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-900">{q.prompt}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <QuestionBankEditor
          key={activePackage.id}
          pkg={activePackage}
          onSavePackage={handleSavePackage}
        />
      </main>
    </div>
  );
}
