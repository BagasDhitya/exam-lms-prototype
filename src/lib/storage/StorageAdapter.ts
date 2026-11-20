import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  UserAccount,
} from "@/types/lms";
import { LocalStorageAdapter } from "./LocalStorageAdapter";

export interface StorageAdapter {
  getServerNow(): Promise<number>;
  getUsers(): Promise<UserAccount[]>;
  saveUser(user: UserAccount): Promise<void>;
  saveUsersBulk(users: UserAccount[]): Promise<void>;
  getPackages(): Promise<ExamPackage[]>;
  savePackage(pkg: ExamPackage): Promise<void>;
  getSchedules(): Promise<ExamSchedule[]>;
  saveSchedule(schedule: ExamSchedule): Promise<void>;
  getAttempts(scheduleId?: string): Promise<ExamAttempt[]>;
  getAttemptByStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<ExamAttempt | null>;
  saveAttempt(attempt: ExamAttempt): Promise<void>;
  resetDemoData(): Promise<void>;
}

// Instance default yang bisa di-import langsung dari '@/lib/storage/StorageAdapter'
// Saat migrasi ke backend/DB, cukup ganti LocalStorageAdapter dengan ApiStorageAdapter
export const storage: StorageAdapter = new LocalStorageAdapter();
