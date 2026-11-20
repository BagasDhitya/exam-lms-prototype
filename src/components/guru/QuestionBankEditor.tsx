"use client";

import React, { useState } from "react";
import { ExamPackage, Question, QuestionType } from "@/types/lms";

interface QuestionBankEditorProps {
  pkg: ExamPackage;
  onSavePackage: (updated: ExamPackage) => Promise<void>;
}

export default function QuestionBankEditor({
  pkg,
  onSavePackage,
}: QuestionBankEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(pkg.questions);
  const [type, setType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [prompt, setPrompt] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [weight, setWeight] = useState<number>(10);
  const [optionsText, setOptionsText] = useState<string[]>(["", "", "", ""]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(0);

  const totalWeight = questions.reduce((sum, q) => sum + q.weight, 0);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const id = `q-${Date.now()}`;
    const builtOptions =
      type === "MULTIPLE_CHOICE"
        ? optionsText.map((txt, idx) => ({
            id: `${id}-opt-${idx}`,
            text: txt.trim() || `Opsi ${idx + 1}`,
          }))
        : undefined;

    const resolvedKey =
      type === "MULTIPLE_CHOICE" && builtOptions
        ? (builtOptions[correctOptionIdx]?.id ?? builtOptions[0].id)
        : answerKey.trim();

    const newQ: Question = {
      id,
      packageId: pkg.id,
      number: questions.length + 1,
      type,
      prompt: prompt.trim(),
      options: builtOptions,
      answerKey: resolvedKey,
      weight: Number(weight) || 10,
    };

    const updatedList = [...questions, newQ];
    setQuestions(updatedList);
    await onSavePackage({ ...pkg, questions: updatedList });

    setPrompt("");
    setAnswerKey("");
    setOptionsText(["", "", "", ""]);
  };

  const handleDeleteQuestion = async (qId: string) => {
    const filtered = questions
      .filter((q) => q.id !== qId)
      .map((q, idx) => ({ ...q, number: idx + 1 }));
    setQuestions(filtered);
    await onSavePackage({ ...pkg, questions: filtered });
  };

  return (
    <div className="space-y-6">
      {/* Form Tambah Butir Soal */}
      <form
        onSubmit={handleAddQuestion}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Tambah Butir Soal Campuran
          </h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Total Bobot Paket: {totalWeight} Poin
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Tipe Soal
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
              <option value="SHORT_ANSWER">Isian Singkat</option>
              <option value="ESSAY">Uraian / Esai</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Bobot Nilai Butir Ini
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Kolom Pertanyaan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Kolom Pertanyaan (Soal)
            </label>
            <textarea
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tuliskan redaksi pertanyaan di sini..."
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900"
            />
          </div>

          {/* Kolom Kunci Jawaban */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Kolom Kunci Jawaban / Rubrik
            </label>
            {type === "MULTIPLE_CHOICE" ? (
              <div className="mt-1 space-y-2">
                {optionsText.map((optVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptionIdx === idx}
                      onChange={() => setCorrectOptionIdx(idx)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <input
                      type="text"
                      required
                      value={optVal}
                      onChange={(e) => {
                        const copy = [...optionsText];
                        copy[idx] = e.target.value;
                        setOptionsText(copy);
                      }}
                      placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                rows={3}
                required
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                placeholder={
                  type === "SHORT_ANSWER"
                    ? "Kata/frasa kunci jawaban tepat..."
                    : "Poin-poin kunci rubrik penilaian esai..."
                }
                className="mt-1 w-full rounded-lg border border-emerald-300 bg-emerald-50/40 p-3 text-sm text-slate-900"
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Simpan ke Bank Soal
          </button>
        </div>
      </form>

      {/* Tabel Pemisahan Kolom Soal vs Kolom Kunci Jawaban */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Kolom Pertanyaan (Soal)</th>
              <th className="px-4 py-3">Kolom Kunci Jawaban</th>
              <th className="px-4 py-3 text-right">Bobot</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.map((q) => {
              const displayKey =
                q.type === "MULTIPLE_CHOICE"
                  ? (q.options?.find((o) => o.id === q.answerKey)?.text ?? "-")
                  : q.answerKey;
              return (
                <tr key={q.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {q.number}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {q.type}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-900">
                    {q.prompt}
                  </td>
                  <td className="max-w-xs px-4 py-3 font-medium text-emerald-800 bg-emerald-50/30">
                    {displayKey}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700">
                    {q.weight}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
