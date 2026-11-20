"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ExamRunner from "@/components/murid/ExamRunner";
import ExamSubmittedView from "@/components/murid/ExamSubmittedView";
import PinEntryCard from "@/components/murid/PinEntryCard";
import { shuffleArray } from "@/lib/examEngine";
import { storage } from "@/lib/storage/StorageAdapter";
import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  UserAccount,
} from "@/types/lms";

const SESSION_USER_KEY = "exam_lms_active_user_v1";

export default function MuridExamPage() {
  const router = useRouter();
  const [student, setStudent] = useState<UserAccount | null>(null);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [serverNow, setServerNow] = useState<number>(0);
  const [activeSchedule, setActiveSchedule] = useState<ExamSchedule | null>(
    null,
  );
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      router.push("/");
      return;
    }
    const parsed = JSON.parse(raw) as UserAccount;
    if (parsed.role !== "MURID") {
      router.push("/");
      return;
    }
    setStudent(parsed);

    const load = async () => {
      const [sList, pList, now, allAttempts] = await Promise.all([
        storage.getSchedules(),
        storage.getPackages(),
        storage.getServerNow(),
        storage.getAttempts(),
      ]);
      setSchedules(sList);
      setPackages(pList);
      setServerNow(now);

      // Lanjutkan sesi jika sudah pernah memulai pada salah satu jadwal
      const existingAttempt = allAttempts.find(
        (a) => a.studentId === parsed.id,
      );
      if (existingAttempt) {
        const matchedSch = sList.find(
          (s) => s.id === existingAttempt.scheduleId,
        );
        if (matchedSch) {
          setActiveSchedule(matchedSch);
          setAttempt(existingAttempt);
        }
      }
    };
    void load();
  }, [router]);

  const handleStartWithPin = async (schedule: ExamSchedule, pin: string) => {
    if (!student) return;
    const pkg = packages.find((p) => p.id === schedule.packageId);
    if (!pkg) return;

    const existing = await storage.getAttemptByStudent(schedule.id, student.id);
    if (existing) {
      setActiveSchedule(schedule);
      setAttempt(existing);
      return;
    }

    const shuffledQuestions = shuffleArray(pkg.questions);
    const questionOrder = shuffledQuestions.map((q) => q.id);
    const optionOrderMap: Record<string, string[]> = {};

    for (const q of shuffledQuestions) {
      if (q.options && q.options.length > 0) {
        optionOrderMap[q.id] = shuffleArray(q.options).map((o) => o.id);
      }
    }

    const newAttempt: ExamAttempt = {
      id: `att-${schedule.id}-${student.id}-${Date.now()}`,
      scheduleId: schedule.id,
      studentId: student.id,
      status: "ACTIVE",
      pinUsed: pin,
      startedAt: new Date(await storage.getServerNow()).toISOString(),
      questionOrder,
      optionOrderMap,
      answers: {},
      violations: [],
      unlockCount: 0,
    };

    await storage.saveAttempt(newAttempt);
    setActiveSchedule(schedule);
    setAttempt(newAttempt);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_USER_KEY);
    router.push("/");
  };

  if (!student) return null;

  const activePackage = activeSchedule
    ? packages.find((p) => p.id === activeSchedule.packageId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentUser={student} onLogout={handleLogout} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!attempt || !activeSchedule ? (
          <PinEntryCard
            student={student}
            schedules={schedules}
            serverNow={serverNow}
            onStartWithPin={handleStartWithPin}
          />
        ) : attempt.status === "SUBMITTED" ? (
          <ExamSubmittedView
            schedule={activeSchedule}
            attempt={attempt}
            onBackToHome={handleLogout}
          />
        ) : activePackage ? (
          <ExamRunner
            pkg={activePackage}
            schedule={activeSchedule}
            initialAttempt={attempt}
            onAttemptUpdated={(updated) => setAttempt(updated)}
          />
        ) : null}
      </main>
    </div>
  );
}
