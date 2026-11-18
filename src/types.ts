export type BookStatus = "reading" | "want-to-read" | "finished";
export interface Book {
  id: string; title: string; author: string; totalPages: number; pagesRead: number;
  status: BookStatus; color: string; createdAt: string; startedAt?: string; finishedAt?: string;
}
export interface ReadingSession {
  id: string; bookId: string; date: string; minutes: number; pagesRead: number; note?: string;
}
export interface AppData {
  books: Book[]; sessions: ReadingSession[]; goals: { dailyMinutes: number; annualBooks: number };
}
