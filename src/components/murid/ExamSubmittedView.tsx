"use client";

import React from "react";
import { ExamAttempt, ExamSchedule } from "@/types/lms";

interface ExamSubmittedViewProps {
  schedule: ExamSchedule;
  attempt: ExamAttempt;
  onBackToHome: () => void;
}

export default function ExamSubmittedView({
  schedule,
  attempt,
  onBackToHome,
}: ExamSubmittedViewProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
        Ujian Selesai
      </span>
      <h1 className="mt-4 text-xl font-bold text-slate-900">
        Jawaban Berhasil Dikumpulkan
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Sesi <strong>{schedule.title}</strong> telah tercatat pada{" "}
        {attempt.submittedAt
          ? new Date(attempt.submittedAt).toLocaleString("id-ID")
          : "sistem"}{" "}
        dan kode PIN ujian Anda telah hangus/nonaktif.
      </p>
      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Sesuai kebijakan penilaian, skor/nilai dan kunci jawaban tidak
        ditampilkan kepada peserta ujian.
      </p>
      <button
        type="button"
        onClick={onBackToHome}
        className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
      >
        Kembali ke Halaman Masuk
      </button>
    </div>
  );
}
