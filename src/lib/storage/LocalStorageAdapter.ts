import {
  ExamAttempt,
  ExamPackage,
  ExamSchedule,
  UserAccount,
} from "@/types/lms";
import { StorageAdapter } from "./StorageAdapter";

const STORAGE_KEY = "exam_lms_prototype_v1";

interface StoreSchema {
  users: UserAccount[];
  packages: ExamPackage[];
  schedules: ExamSchedule[];
  attempts: ExamAttempt[];
}

const DEFAULT_SEED: StoreSchema = {
  users: [
    {
      id: "op-1",
      fullName: "Admin Operator Sekolah",
      role: "OPERATOR",
      username: "operator",
      password: "123",
    },
    {
      id: "guru-1",
      fullName: "Budi Santoso, S.Pd.",
      role: "GURU",
      username: "guru",
      password: "123",
    },
    {
      id: "m-1",
      fullName: "Alya Putri",
      className: "X-IPA-1",
      role: "MURID",
      username: "alya.xipa1",
      password: "123",
    },
    {
      id: "m-2",
      fullName: "Dimas Pratama",
      className: "X-IPA-1",
      role: "MURID",
      username: "dimas.xipa1",
      password: "123",
    },
  ],
  packages: [
    {
      id: "pkg-geo-1",
      title: "Penilaian Tengah Semester - Dinamika Litosfer",
      subject: "Geografi Kelas X",
      createdBy: "guru-1",
      questions: [
        {
          id: "q-1",
          packageId: "pkg-geo-1",
          number: 1,
          type: "MULTIPLE_CHOICE",
          prompt:
            "Tenaga endogen yang menyebabkan pergeseran lapisan kerak bumi secara vertikal maupun horizontal pada wilayah luas disebut...",
          options: [
            { id: "opt-a", text: "Epirogenesa" },
            { id: "opt-b", text: "Orogenesa" },
            { id: "opt-c", text: "Vulkanisme" },
            { id: "opt-d", text: "Sedimentasi" },
          ],
          answerKey: "opt-a",
          weight: 20,
          gradingNote: "Otomatis: 100% jika tepat, 0% jika salah.",
        },
        {
          id: "q-2",
          packageId: "pkg-geo-1",
          number: 2,
          type: "SHORT_ANSWER",
          prompt:
            "Alat pencatat gelombang gempa bumi yang menghasilkan grafik seismogram disebut...",
          answerKey: "seismograf",
          weight: 30,
          gradingNote: "Otomatis (case-insensitive, trim spasi).",
        },
        {
          id: "q-3",
          packageId: "pkg-geo-1",
          number: 3,
          type: "ESSAY",
          prompt:
            "Jelaskan 2 langkah mitigasi struktural untuk mengurangi risiko korban jiwa pada kawasan rawan likuifaksi!",
          answerKey:
            "1) Pemadatan tanah (soil compaction) sebelum konstruksi; 2) Pembuatan sistem drainase bawah permukaan untuk menurunkan muka air tanah.",
          weight: 50,
          gradingNote: "Rubrik Uraian: 25 poin per langkah mitigasi logis.",
        },
      ],
    },
  ],
  schedules: [
    {
      id: "sch-1",
      packageId: "pkg-geo-1",
      title: "PTS Geografi Sesi 1",
      startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      durationMinutes: 60,
      maxViolations: 2,
      studentPins: {
        "m-1": "482910",
        "m-2": "739104",
      },
    },
  ],
  attempts: [],
};

export class LocalStorageAdapter implements StorageAdapter {
  private read(): StoreSchema {
    if (typeof window === "undefined") return DEFAULT_SEED;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.write(DEFAULT_SEED);
      return DEFAULT_SEED;
    }
    return JSON.parse(raw) as StoreSchema;
  }

  private write(data: StoreSchema): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async getServerNow(): Promise<number> {
    // Pada produksi, ganti dengan endpoint GET /api/server-time
    return Date.now();
  }

  async getUsers(): Promise<UserAccount[]> {
    return this.read().users;
  }

  async saveUser(user: UserAccount): Promise<void> {
    const db = this.read();
    const idx = db.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) db.users[idx] = user;
    else db.users.push(user);
    this.write(db);
  }

  async saveUsersBulk(users: UserAccount[]): Promise<void> {
    const db = this.read();
    db.users.push(...users);
    this.write(db);
  }

  async getPackages(): Promise<ExamPackage[]> {
    return this.read().packages;
  }

  async savePackage(pkg: ExamPackage): Promise<void> {
    const db = this.read();
    const idx = db.packages.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) db.packages[idx] = pkg;
    else db.packages.push(pkg);
    this.write(db);
  }

  async getSchedules(): Promise<ExamSchedule[]> {
    return this.read().schedules;
  }

  async saveSchedule(schedule: ExamSchedule): Promise<void> {
    const db = this.read();
    const idx = db.schedules.findIndex((s) => s.id === schedule.id);
    if (idx >= 0) db.schedules[idx] = schedule;
    else db.schedules.push(schedule);
    this.write(db);
  }

  async getAttempts(scheduleId?: string): Promise<ExamAttempt[]> {
    const all = this.read().attempts;
    return scheduleId ? all.filter((a) => a.scheduleId === scheduleId) : all;
  }

  async getAttemptByStudent(
    scheduleId: string,
    studentId: string,
  ): Promise<ExamAttempt | null> {
    return (
      this.read().attempts.find(
        (a) => a.scheduleId === scheduleId && a.studentId === studentId,
      ) ?? null
    );
  }

  async saveAttempt(attempt: ExamAttempt): Promise<void> {
    const db = this.read();
    const idx = db.attempts.findIndex((a) => a.id === attempt.id);
    if (idx >= 0) db.attempts[idx] = attempt;
    else db.attempts.push(attempt);
    this.write(db);
  }

  async resetDemoData(): Promise<void> {
    this.write(DEFAULT_SEED);
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
