"use client";

import React, { useState } from "react";
import { ExamSchedule, UserAccount } from "@/types/lms";

interface PinEntryCardProps {
  student: UserAccount;
  schedules: ExamSchedule[];
  serverNow: number;
  onStartWithPin: (schedule: ExamSchedule, pin: string) => Promise<void>;
}

export default function PinEntryCard({
  student,
  schedules,
  serverNow,
  onStartWithPin,
}: PinEntryCardProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    schedules[0]?.id ?? "",
  );
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const schedule = schedules.find((s) => s.id === selectedScheduleId);
    if (!schedule) {
      setErrorMsg("Jadwal ujian tidak ditemukan.");
      return;
    }

    const startMs = new Date(schedule.startTime).getTime();
    const endMs = new Date(schedule.endTime).getTime();

    if (serverNow < startMs) {
      setErrorMsg("Sesi ujian belum dimulai sesuai jadwal.");
      return;
    }
    if (serverNow > endMs) {
      setErrorMsg("Waktu jadwal ujian sudah berakhir (PIN hangus).");
      return;
    }

    const expectedPin = schedule.studentPins[student.id];
    if (!expectedPin || expectedPin !== pinInput.trim()) {
      setErrorMsg("Kode PIN unik tidak valid untuk akun Anda pada sesi ini.");
      return;
    }

    setLoading(true);
    try {
      await onStartWithPin(schedule, pinInput.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Verifikasi PIN Ujian</h1>
      <p className="mt-1 text-xs text-slate-500">
        Peserta: <strong className="text-slate-800">{student.fullName}</strong>{" "}
        ({student.username})
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Pilih Sesi Ujian
          </label>
          <select
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.durationMinutes} menit)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700">
            Kode PIN Unik Anda
          </label>
          <input
            type="text"
            required
            maxLength={10}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Masukkan 6 digit PIN"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-base font-bold tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {errorMsg && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Memulai Sesi..." : "Mulai Ujian"}
        </button>
      </form>
    </div>
  );
}
