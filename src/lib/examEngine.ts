import { ExamAttempt, ExamPackage, Question, UserAccount } from "@/types/lms";

export function generateCredentials(
  fullName: string,
  className: string,
): Pick<UserAccount, "username" | "password"> {
  const cleanName =
    fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)[0] || "murid";
  const cleanClass = className
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const randomDigits = Math.floor(100 + Math.random() * 900);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return {
    username: `${cleanName}.${cleanClass || "ujian"}${randomDigits}`,
    password,
  };
}

export function generateUniquePin(existingPins: Set<string>): string {
  let pin = "";
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingPins.has(pin));
  existingPins.add(pin);
  return pin;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function evaluateQuestionScore(
  question: Question,
  attempt: ExamAttempt,
): { earned: number; isCorrect: boolean; isPendingManual: boolean } {
  const ans = attempt.answers[question.id];
  if (!ans || !ans.answer.trim()) {
    return { earned: 0, isCorrect: false, isPendingManual: false };
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const correct = ans.answer === question.answerKey;
    return {
      earned: correct ? question.weight : 0,
      isCorrect: correct,
      isPendingManual: false,
    };
  }

  if (question.type === "SHORT_ANSWER") {
    const normalizedStudent = ans.answer.trim().toLowerCase();
    const normalizedKey = question.answerKey.trim().toLowerCase();
    const correct = normalizedStudent === normalizedKey;
    return {
      earned: correct ? question.weight : 0,
      isCorrect: correct,
      isPendingManual: false,
    };
  }

  // ESSAY
  if (typeof ans.manualScore === "number") {
    const bounded = Math.max(0, Math.min(question.weight, ans.manualScore));
    return {
      earned: bounded,
      isCorrect: bounded >= question.weight * 0.6,
      isPendingManual: false,
    };
  }

  return { earned: 0, isCorrect: false, isPendingManual: true };
}

export function calculateTotalWeightedScore(
  pkg: ExamPackage,
  attempt: ExamAttempt,
): {
  totalEarned: number;
  maxWeight: number;
  percentage: number;
  hasPendingEssay: boolean;
} {
  let totalEarned = 0;
  let maxWeight = 0;
  let hasPendingEssay = false;

  for (const q of pkg.questions) {
    maxWeight += q.weight;
    const res = evaluateQuestionScore(q, attempt);
    totalEarned += res.earned;
    if (res.isPendingManual) hasPendingEssay = true;
  }

  const percentage =
    maxWeight > 0 ? Math.round((totalEarned / maxWeight) * 1000) / 10 : 0;

  return { totalEarned, maxWeight, percentage, hasPendingEssay };
}
