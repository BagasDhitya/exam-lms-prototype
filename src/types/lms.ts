export type UserRole = "OPERATOR" | "GURU" | "MURID";

export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ESSAY";

export type SessionStatus =
  | "NOT_STARTED"
  | "ACTIVE"
  | "WARNING"
  | "LOCKED"
  | "SUBMITTED";

export interface UserAccount {
  id: string;
  fullName: string;
  className?: string;
  role: UserRole;
  username: string;
  password: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  packageId: string;
  number: number;
  type: QuestionType;
  prompt: string; // Kolom Pertanyaan (Soal)
  options?: QuestionOption[]; // Khusus Pilihan Ganda
  answerKey: string; // Kolom Kunci Jawaban (ID opsi untuk PG, teks referensi untuk isian/esai)
  weight: number; // Bobot nilai spesifik per butir soal
  gradingNote?: string; // Rubrik/aturan penilaian (misal: eksak vs rubrik manual esai)
}

export interface ExamPackage {
  id: string;
  title: string;
  subject: string;
  createdBy: string;
  questions: Question[];
}

export interface ExamSchedule {
  id: string;
  packageId: string;
  title: string;
  startTime: string; // ISO String (validasi konsisten berbasis server time)
  endTime: string; // ISO String
  durationMinutes: number; // Durasi saklek
  maxViolations: number; // Batas toleransi pelanggaran (misal: 2 atau 3)
  studentPins: Record<string, string>; // studentId -> PIN unik per murid
}

export interface ViolationLog {
  id: string;
  timestamp: string;
  durationSeconds: number;
  reason: string;
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  manualScore?: number; // Untuk soal ESAY yang dinilai guru
}

export interface ExamAttempt {
  id: string;
  scheduleId: string;
  studentId: string;
  status: SessionStatus;
  pinUsed: string;
  startedAt?: string;
  submittedAt?: string;
  questionOrder: string[]; // Urutan ID soal yang sudah diacak per murid
  optionOrderMap: Record<string, string[]>; // questionId -> urutan ID opsi yang diacak
  answers: Record<string, StudentAnswer>;
  violations: ViolationLog[];
  unlockCount: number;
}
