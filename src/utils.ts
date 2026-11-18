export const STORAGE_KEY = "readly:v1";
export const initialData = { books: [], sessions: [], goals: { dailyMinutes: 20, annualBooks: 12 } };
export function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData;
    const data = JSON.parse(raw);
    return { books: Array.isArray(data.books) ? data.books : [], sessions: Array.isArray(data.sessions) ? data.sessions : [], goals: { dailyMinutes: Number(data.goals?.dailyMinutes) || 20, annualBooks: Number(data.goals?.annualBooks) || 12 } };
  } catch { return initialData; }
}
export function saveData(data: unknown) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage can be unavailable */ }
}
export function formatMinutes(value: number) {
  const m = Math.max(0, Math.floor(value)), h = Math.floor(m/60), rest = m%60;
  return h ? (rest ? h + "h " + rest + "min" : h + "h") : rest + " min";
}
export function streakCount(dates: string[]) {
  const set = new Set(dates), cursor = new Date();
  if (!set.has(dateKey(cursor))) cursor.setDate(cursor.getDate()-1);
  let count = 0;
  while (set.has(dateKey(cursor))) { count++; cursor.setDate(cursor.getDate()-1); }
  return count;
}
