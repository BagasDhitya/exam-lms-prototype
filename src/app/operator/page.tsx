"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SpreadsheetReport from "@/components/operator/SpreadSheetReport";
import { generateCredentials, generateUniquePin } from "@/lib/examEngine";
import { exportToCsv } from "@/lib/exportUtils";
import { storage } from "@/lib/storage/StorageAdapter";
import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  UserAccount,
} from "@/types/lms";

const SESSION_USER_KEY = "exam_lms_active_user_v1";

export default function OperatorPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("sch-1");

  // Form tambah murid (satuan atau banyak baris per kelas)
  const [classNameInput, setClassNameInput] = useState("X-IPA-1");
  const [bulkNamesInput, setBulkNamesInput] = useState("");

  // Form pengaturan jadwal & toleransi
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [maxViolations, setMaxViolations] = useState<number>(2);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    const [uList, pList, sList, aList] = await Promise.all([
      storage.getUsers(),
      storage.getPackages(),
      storage.getSchedules(),
      storage.getAttempts(),
    ]);
    setUsers(uList);
    setPackages(pList);
    setSchedules(sList);
    setAttempts(aList);

    const activeSch =
      sList.find((s) => s.id === selectedScheduleId) ?? sList[0];
    if (activeSch) {
      setSelectedScheduleId(activeSch.id);
      setDurationMinutes(activeSch.durationMinutes);
      setMaxViolations(activeSch.maxViolations);
    }
  }, [selectedScheduleId]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed = JSON.parse(raw) as UserAccount;
    if (parsed.role !== "OPERATOR") {
      router.push("/");
      return;
    }
    setCurrentUser(parsed);
    void refreshAll();
  }, [router, refreshAll]);

  const students = users.filter((u) => u.role === "MURID");
  const activeSchedule =
    schedules.find((s) => s.id === selectedScheduleId) ?? schedules[0];
  const activePackage =
    packages.find((p) => p.id === activeSchedule?.packageId) ?? packages[0];

  const handleGenerateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkNamesInput
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const createdAccounts: UserAccount[] = lines.map((fullName, idx) => {
      const creds = generateCredentials(fullName, classNameInput);
      return {
        id: `m-${Date.now()}-${idx}`,
        fullName,
        className: classNameInput.trim() || "Umum",
        role: "MURID",
        username: creds.username,
        password: creds.password,
      };
    });

    await storage.saveUsersBulk(createdAccounts);

    // Otomatis buatkan PIN unik untuk murid baru pada jadwal aktif
    if (activeSchedule) {
      const usedPins = new Set(Object.values(activeSchedule.studentPins));
      const nextPins = { ...activeSchedule.studentPins };
      for (const acc of createdAccounts) {
        nextPins[acc.id] = generateUniquePin(usedPins);
      }
      await storage.saveSchedule({ ...activeSchedule, studentPins: nextPins });
    }

    setBulkNamesInput("");
    setStatusNotice(
      `${createdAccounts.length} akun murid baru berhasil dibuat beserta username, password acak, dan PIN unik.`,
    );
    await refreshAll();
  };

  const handleSaveScheduleRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchedule) return;

    const usedPins = new Set<string>();
    const nextPins: Record<string, string> = { ...activeSchedule.studentPins };
    for (const st of students) {
      if (!nextPins[st.id]) {
        nextPins[st.id] = generateUniquePin(usedPins);
      } else {
        usedPins.add(nextPins[st.id]);
      }
    }

    const updated: ExamSchedule = {
      ...activeSchedule,
      durationMinutes: Math.max(5, Number(durationMinutes) || 60),
      maxViolations: Math.max(1, Number(maxViolations) || 2),
      studentPins: nextPins,
    };

    await storage.saveSchedule(updated);
    setStatusNotice(
      "Pengaturan durasi saklek, batas toleransi pelanggaran, dan PIN unik murid tersimpan.",
    );
    await refreshAll();
  };

  const handleRegenerateAllPins = async () => {
    if (!activeSchedule) return;
    const usedPins = new Set<string>();
    const freshPins: Record<string, string> = {};
    for (const st of students) {
      freshPins[st.id] = generateUniquePin(usedPins);
    }
    await storage.saveSchedule({ ...activeSchedule, studentPins: freshPins });
    setStatusNotice("Seluruh PIN unik murid pada sesi ini telah diperbarui.");
    await refreshAll();
  };

  const handleUnlockAttempt = async (attempt: ExamAttempt) => {
    const unlocked: ExamAttempt = {
      ...attempt,
      status: "ACTIVE",
      unlockCount: attempt.unlockCount + 1,
    };
    await storage.saveAttempt(unlocked);
    setStatusNotice("Sesi murid berhasil dibuka kembali (UNLOCK).");
    await refreshAll();
  };

  const handleExportAccountsCsv = () => {
    exportToCsv(
      "daftar-akun-murid",
      students.map((s, idx) => ({
        No: idx + 1,
        Nama_Murid: s.fullName,
        Kelas: s.className ?? "-",
        Username: s.username,
        Password: s.password,
        PIN_Ujian: activeSchedule?.studentPins[s.id] ?? "-",
      })),
    );
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_USER_KEY);
    router.push("/");
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Panel Kendali Operator
          </h1>
          <p className="text-sm text-slate-500">
            Kelola akun murid, PIN unik per sesi, durasi & batas pelanggaran,
            serta rekap hasil ujian.
          </p>
        </div>

        {statusNotice && (
          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-900">
            <span>{statusNotice}</span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="rounded bg-indigo-200/70 px-2 py-0.5 font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Grid 2 Kolom: Akun Murid & Aturan Sesi */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Manajemen Akun Murid */}
          <form
            onSubmit={handleGenerateStudents}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">
              Buat Akun Murid (Auto-Generate Kredensial)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Masukkan satu atau banyak nama murid (1 nama per baris). Username
              dan password acak dibuat otomatis.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Kelas
                </label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap Murid (1 per baris)
                </label>
                <textarea
                  rows={4}
                  required
                  value={bulkNamesInput}
                  onChange={(e) => setBulkNamesInput(e.target.value)}
                  placeholder={"Raka Wijaya\nNadia Kusuma\nBagas Pratama"}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Generate Akun & PIN Unik
              </button>
            </div>
          </form>

          {/* Pengaturan Jadwal, Durasi & Batas Pelanggaran */}
          <form
            onSubmit={handleSaveScheduleRules}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Durasi, PIN & Toleransi
              </h2>
              <button
                type="button"
                onClick={() => void handleRegenerateAllPins()}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Acak Ulang Semua PIN
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Sesi Jadwal Ujian
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {schedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Durasi Saklek (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Batas Toleransi Pelanggaran
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxViolations}
                    onChange={(e) => setMaxViolations(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Simpan Aturan Sesi
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Kredensial & PIN Murid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Akun Murid & PIN Sesi ({students.length})
            </h2>
            <button
              type="button"
              onClick={handleExportAccountsCsv}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ekspor Akun (.CSV)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 font-semibold text-slate-700">
                <tr>
                  <th className="border border-slate-200 px-3 py-2">Nama</th>
                  <th className="border border-slate-200 px-3 py-2">Kelas</th>
                  <th className="border border-slate-200 px-3 py-2">
                    Username
                  </th>
                  <th className="border border-slate-200 px-3 py-2">
                    Password
                  </th>
                  <th className="border border-slate-200 px-3 py-2">
                    PIN Unik
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border border-slate-200 px-3 py-2 font-semibold">
                      {st.fullName}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      {st.className ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-mono">
                      {st.username}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-mono">
                      {st.password}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-indigo-700">
                      {activeSchedule?.studentPins[st.id] ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekap Spreadsheet & Analisis Butir Soal */}
        {activeSchedule && activePackage && (
          <SpreadsheetReport
            students={students}
            pkg={activePackage}
            schedule={activeSchedule}
            attempts={attempts.filter(
              (a) => a.scheduleId === activeSchedule.id,
            )}
            onUnlockAttempt={handleUnlockAttempt}
          />
        )}
      </main>
    </div>
  );
}
