"use client";

import React from "react";
import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  UserAccount,
} from "@/types/lms";
import {
  calculateTotalWeightedScore,
  evaluateQuestionScore,
} from "@/lib/examEngine";
import { exportToCsv, exportToXlsx, SpreadsheetRow } from "@/lib/exportUtils";

interface SpreadsheetReportProps {
  students: UserAccount[];
  pkg: ExamPackage;
  schedule: ExamSchedule;
  attempts: ExamAttempt[];
  onUnlockAttempt: (attempt: ExamAttempt) => Promise<void>;
}

export default function SpreadsheetReport({
  students,
  pkg,
  schedule,
  attempts,
  onUnlockAttempt,
}: SpreadsheetReportProps) {
  const rowsData = students.map((student) => {
    const attempt = attempts.find((a) => a.studentId === student.id);
    const pin = schedule.studentPins[student.id] ?? "-";
    const scoreInfo = attempt
      ? calculateTotalWeightedScore(pkg, attempt)
      : {
          totalEarned: 0,
          maxWeight: 100,
          percentage: 0,
          hasPendingEssay: false,
        };
    const totalOutSeconds = attempt
      ? attempt.violations.reduce((s, v) => s + v.durationSeconds, 0)
      : 0;

    return {
      student,
      attempt,
      pin,
      scoreInfo,
      totalOutSeconds,
    };
  });

  const buildExportRows = (): SpreadsheetRow[] =>
    rowsData.map((r, idx) => ({
      No: idx + 1,
      Nama_Murid: r.student.fullName,
      Kelas: r.student.className ?? "-",
      Username: r.student.username,
      PIN_Sesi: r.pin,
      Status: r.attempt?.status ?? "BELUM_MASUK",
      Jumlah_Pelanggaran: r.attempt?.violations.length ?? 0,
      Total_Durasi_Keluar_Detik: r.totalOutSeconds,
      Skor_Mentah: r.scoreInfo.totalEarned,
      Skor_Maksimal: r.scoreInfo.maxWeight,
      Nilai_Akhir_Persen: r.scoreInfo.percentage,
    }));

  // Analisis Butir Soal Per Nomor
  const itemStats = pkg.questions.map((q) => {
    const submittedAttempts = attempts.filter((a) => a.status === "SUBMITTED");
    let correctCount = 0;
    let wrongCount = 0;

    for (const att of submittedAttempts) {
      const evalRes = evaluateQuestionScore(q, att);
      if (evalRes.isCorrect) correctCount++;
      else wrongCount++;
    }

    const totalEvaluated = submittedAttempts.length;
    const correctPct =
      totalEvaluated > 0
        ? Math.round((correctCount / totalEvaluated) * 100)
        : 0;
    const wrongPct = totalEvaluated > 0 ? 100 - correctPct : 0;

    return {
      question: q,
      totalEvaluated,
      correctCount,
      wrongCount,
      correctPct,
      wrongPct,
    };
  });

  const hardestQuestion = [...itemStats].sort(
    (a, b) => b.wrongPct - a.wrongPct,
  )[0];

  return (
    <div className="space-y-8">
      {/* Bagian 1: Tabel Rekap Ala Spreadsheet */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rekap Nilai & Log Pelanggaran (Spreadsheet)
            </h2>
            <p className="text-xs text-slate-500">
              Klik &ldquo;Buka Kunci&rdquo; pada baris berstatus Terkunci untuk
              mengizinkan murid melanjutkan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportToCsv("rekap-ujian", buildExportRows())}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ekspor .CSV
            </button>
            <button
              type="button"
              onClick={() => exportToXlsx("rekap-ujian", buildExportRows())}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Ekspor .XLSX
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700">
              <tr>
                <th className="border border-slate-200 px-3 py-2.5">No</th>
                <th className="border border-slate-200 px-3 py-2.5">
                  Nama Murid
                </th>
                <th className="border border-slate-200 px-3 py-2.5">Kelas</th>
                <th className="border border-slate-200 px-3 py-2.5">
                  PIN Unik
                </th>
                <th className="border border-slate-200 px-3 py-2.5">
                  Status Sesi
                </th>
                <th className="border border-slate-200 px-3 py-2.5">
                  Pelanggaran (Durasi)
                </th>
                <th className="border border-slate-200 px-3 py-2.5 text-right">
                  Nilai Berbobot
                </th>
                <th className="border border-slate-200 px-3 py-2.5 text-center">
                  Kontrol Sesi
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsData.map((row, idx) => {
                const status = row.attempt?.status ?? "NOT_STARTED";
                return (
                  <tr
                    key={row.student.id}
                    className="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/40"
                  >
                    <td className="border border-slate-200 px-3 py-2 font-mono">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-900">
                      {row.student.fullName}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-600">
                      {row.student.className ?? "-"}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-mono font-bold text-indigo-700">
                      {row.pin}
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          status === "LOCKED"
                            ? "bg-rose-100 text-rose-800"
                            : status === "WARNING"
                              ? "bg-amber-100 text-amber-800"
                              : status === "SUBMITTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "ACTIVE"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700">
                      {row.attempt?.violations.length ?? 0}x (
                      {row.totalOutSeconds} dtk)
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-right font-mono font-bold text-slate-900">
                      {row.scoreInfo.totalEarned} / {row.scoreInfo.maxWeight} (
                      {row.scoreInfo.percentage}%)
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {row.attempt && status === "LOCKED" ? (
                        <button
                          type="button"
                          onClick={() => onUnlockAttempt(row.attempt!)}
                          className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                        >
                          Buka Kunci
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian 2: Analisis Butir Soal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Analisis Butir Soal Per Nomor
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan persentase murid Benar vs Salah & identifikasi soal
              tersulit.
            </p>
          </div>
          {hardestQuestion && hardestQuestion.totalEvaluated > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-900">
              <span className="font-bold">Soal Tersulit:</span> Nomor{" "}
              {hardestQuestion.question.number} (Tingkat Kesalahan:{" "}
              {hardestQuestion.wrongPct}%)
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-3 py-2.5">No</th>
                <th className="px-3 py-2.5">Ringkasan Pertanyaan</th>
                <th className="px-3 py-2.5">Bobot</th>
                <th className="px-3 py-2.5 text-emerald-700">Benar</th>
                <th className="px-3 py-2.5 text-rose-700">Salah</th>
                <th className="px-3 py-2.5">Distribusi Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemStats.map((stat) => (
                <tr key={stat.question.id}>
                  <td className="px-3 py-2.5 font-bold">
                    {stat.question.number}
                  </td>
                  <td className="max-w-md truncate px-3 py-2.5 text-slate-800">
                    {stat.question.prompt}
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    {stat.question.weight}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-emerald-700">
                    {stat.correctCount} ({stat.correctPct}%)
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-rose-700">
                    {stat.wrongCount} ({stat.wrongPct}%)
                  </td>
                  <td className="w-48 px-3 py-2.5">
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-rose-200">
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${stat.correctPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
