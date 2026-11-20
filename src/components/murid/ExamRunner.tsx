"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  ViolationLog,
} from "@/types/lms";
import { storage } from "@/lib/storage/StorageAdapter";

interface ExamRunnerProps {
  pkg: ExamPackage;
  schedule: ExamSchedule;
  initialAttempt: ExamAttempt;
  onAttemptUpdated: (updated: ExamAttempt) => void;
}

const DEBOUNCE_MS = 1500; // Jeda debounce 1.5 detik untuk mencegah false alarm notifikasi

export default function ExamRunner({
  pkg,
  schedule,
  initialAttempt,
  onAttemptUpdated,
}: ExamRunnerProps) {
  const [attempt, setAttempt] = useState<ExamAttempt>(initialAttempt);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    schedule.durationMinutes * 60,
  );
  const [warningBanner, setWarningBanner] = useState<string | null>(null);

  const attemptRef = useRef<ExamAttempt>(initialAttempt);
  attemptRef.current = attempt;

  const hiddenStartRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistAttempt = useCallback(
    async (next: ExamAttempt) => {
      setAttempt(next);
      attemptRef.current = next;
      await storage.saveAttempt(next);
      onAttemptUpdated(next);
    },
    [onAttemptUpdated],
  );

  const handleAutoSubmit = useCallback(async () => {
    const current = attemptRef.current;
    if (current.status === "SUBMITTED") return;
    const finished: ExamAttempt = {
      ...current,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    };
    await persistAttempt(finished);
  }, [persistAttempt]);

  // 1. Timer Saklek Berbasis Waktu Mulai & Batas Jadwal
  // Bersihkan timer & catatan keluar tab saat sesi dimulai atau ditutup
  // Timer Saklek: hitung offset waktu server sekali, lalu tick tiap 1 detik secara mulus
  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startClock = async () => {
      const serverNow = await storage.getServerNow();
      if (!active) return;

      const clockOffsetMs = serverNow - Date.now();

      const updateRemaining = () => {
        if (!active) return;
        const current = attemptRef.current;
        if (current.status === "SUBMITTED") {
          setRemainingSeconds(0);
          return;
        }

        const estimatedServerNow = Date.now() + clockOffsetMs;
        const startedMs = current.startedAt
          ? new Date(current.startedAt).getTime()
          : estimatedServerNow;
        const personalEndMs = startedMs + schedule.durationMinutes * 60 * 1000;
        const scheduleEndMs = new Date(schedule.endTime).getTime();
        const hardDeadlineMs = Math.min(personalEndMs, scheduleEndMs);

        const diffSec = Math.max(
          0,
          Math.floor((hardDeadlineMs - estimatedServerNow) / 1000),
        );

        setRemainingSeconds(diffSec);
        if (diffSec <= 0) {
          void handleAutoSubmit();
        }
      };

      updateRemaining();
      intervalId = setInterval(updateRemaining, 1000);
    };

    void startClock();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [schedule.durationMinutes, schedule.endTime, handleAutoSubmit]);

  // 2. Deteksi Pindah Tab / Keluar Halaman (visibilitychange + debounce + durasi keluar)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const current = attemptRef.current;
      if (current.status === "SUBMITTED" || current.status === "LOCKED") return;

      if (document.hidden) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        const leaveTimestamp = Date.now();
        debounceTimerRef.current = setTimeout(() => {
          hiddenStartRef.current = leaveTimestamp;
        }, DEBOUNCE_MS);
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (hiddenStartRef.current !== null) {
          const durationSec = Math.max(
            1,
            Math.round((Date.now() - hiddenStartRef.current) / 1000),
          );
          const timestampIso = new Date(hiddenStartRef.current).toISOString();
          hiddenStartRef.current = null;

          const newViolation: ViolationLog = {
            id: `vio-${Date.now()}`,
            timestamp: timestampIso,
            durationSeconds: durationSec,
            reason: "Meninggalkan tab/layar ujian (document.hidden)",
          };

          const updatedViolations = [...current.violations, newViolation];
          const reachedLimit =
            updatedViolations.length >= schedule.maxViolations;

          const nextAttempt: ExamAttempt = {
            ...current,
            violations: updatedViolations,
            status: reachedLimit ? "LOCKED" : "WARNING",
          };

          setWarningBanner(
            reachedLimit
              ? `Batas toleransi pelanggaran (${schedule.maxViolations}x) tercapai. Sesi dikunci untuk ditinjau Operator.`
              : `Peringatan Pelanggaran (${updatedViolations.length}/${schedule.maxViolations}): Anda keluar dari layar ujian selama ${durationSec} detik.`,
          );

          void persistAttempt(nextAttempt);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [schedule.maxViolations, persistAttempt]);

  const orderedQuestions = attempt.questionOrder
    .map((qId) => pkg.questions.find((q) => q.id === qId))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const currentQuestion = orderedQuestions[currentIndex];

  const handleAnswerChange = async (value: string) => {
    if (!currentQuestion || attempt.status === "LOCKED") return;
    const next: ExamAttempt = {
      ...attempt,
      answers: {
        ...attempt.answers,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          answer: value,
        },
      },
    };
    await persistAttempt(next);
  };

  const formatClock = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Tampilan Jika Sesi Terkunci Akibat Melampaui Batas Toleransi
  if (attempt.status === "LOCKED") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <span className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Sesi Terkunci
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Ujian Dijeda Sementara
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Sistem mencatat <strong>{attempt.violations.length}x</strong>{" "}
          aktivitas keluar dari tab/layar ujian (batas toleransi:{" "}
          {schedule.maxViolations}x). Hubungi pengawas atau Operator untuk
          membuka kembali sesi Anda.
        </p>
        <div className="mt-4 rounded-xl border border-rose-200 bg-white p-3 text-left text-xs text-slate-600">
          <p className="font-semibold text-slate-800">
            Log Pelanggaran Tercatat:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {attempt.violations.map((v, i) => (
              <li key={v.id}>
                #{i + 1} — Pukul{" "}
                {new Date(v.timestamp).toLocaleTimeString("id-ID")} (Durasi di
                luar layar: {v.durationSeconds} detik)
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const currentAnswer = attempt.answers[currentQuestion.id]?.answer ?? "";
  const orderedOptionIds =
    attempt.optionOrderMap[currentQuestion.id] ??
    currentQuestion.options?.map((o) => o.id) ??
    [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header Sticky Timer & Status */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-medium text-slate-500">{pkg.subject}</p>
          <h1 className="text-sm font-bold text-slate-900 sm:text-base">
            {schedule.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              attempt.violations.length > 0
                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            Pelanggaran: {attempt.violations.length}/{schedule.maxViolations}
          </span>

          <div
            className={`rounded-lg px-3 py-1.5 font-mono text-sm font-bold ${
              remainingSeconds <= 300
                ? "animate-pulse bg-rose-600 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {formatClock(remainingSeconds)}
          </div>
        </div>
      </div>

      {/* Banner Peringatan Pelanggaran */}
      {warningBanner && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{warningBanner}</p>
          <button
            type="button"
            onClick={() => setWarningBanner(null)}
            className="rounded-md bg-amber-200/70 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Navigasi Nomor Soal */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {orderedQuestions.map((q, idx) => {
          const isAnswered = Boolean(attempt.answers[q.id]?.answer?.trim());
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-9 w-9 rounded-lg text-xs font-bold transition ${
                isCurrent
                  ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                  : isAnswered
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Kartu Soal Aktif */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Soal {currentIndex + 1} dari {orderedQuestions.length}
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {currentQuestion.type === "MULTIPLE_CHOICE"
              ? "Pilihan Ganda"
              : currentQuestion.type === "SHORT_ANSWER"
                ? "Isian Singkat"
                : "Uraian / Esai"}
          </span>
        </div>

        <p className="mt-4 text-base leading-relaxed text-slate-900">
          {currentQuestion.prompt}
        </p>

        {/* Input Jawaban Berdasarkan Tipe Soal */}
        <div className="mt-5">
          {currentQuestion.type === "MULTIPLE_CHOICE" && (
            <div className="space-y-2.5">
              {orderedOptionIds.map((optId, optIdx) => {
                const opt = currentQuestion.options?.find(
                  (o) => o.id === optId,
                );
                if (!opt) return null;
                const selected = currentAnswer === opt.id;
                const labelChar = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAnswerChange(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-50/70 font-medium text-indigo-950 ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {labelChar}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === "SHORT_ANSWER" && (
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Ketik jawaban singkat Anda di sini..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          )}

          {currentQuestion.type === "ESSAY" && (
            <textarea
              rows={5}
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Tuliskan uraian jawaban lengkap Anda..."
              className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          )}
        </div>

        {/* Tombol Navigasi & Submit */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Sebelumnya
          </button>

          {currentIndex < orderedQuestions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(orderedQuestions.length - 1, i + 1),
                )
              }
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Berikutnya
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAutoSubmit}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Kumpulkan Ujian
            </button>
          )}
        </div>
      </div>

      {/* Catatan Transparansi Keamanan Browser */}
      <p className="text-center text-xs text-slate-500">
        Pemantauan sesi berbasis browser mencatat perpindahan tab/layar selama
        ujian berlangsung. Tetap berada di halaman ini hingga ujian selesai.
      </p>
    </div>
  );
}
