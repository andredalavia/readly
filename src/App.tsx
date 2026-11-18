import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowRight, Award, BookMarked, BookOpen, Bookmark, CalendarDays,
  Check, ChevronRight, Clock3, Flame, House, Library, ListFilter, Pause, Play,
  Plus, Search, Sparkles, Target, Timer, TimerReset, X
} from "lucide-react";
import type { AppData, Book, BookStatus, ReadingSession } from "./types";
import { dateKey, formatMinutes, loadData, saveData, streakCount } from "./utils";

type Tab = "home" | "library" | "goals";
type Filter = "all" | BookStatus;

const colors = ["#47795c", "#98745b", "#536d83", "#8c6c82", "#9a8150", "#496f70"];
const statusLabels: Record<BookStatus, string> = { reading: "Lendo agora", "want-to-read": "Quero ler", finished: "Concluído" };

function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 className="font-display text-2xl text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </div>
      {children}
    </section>
  </div>;
}

function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return <div className={`book-cover relative flex shrink-0 flex-col justify-between overflow-hidden rounded-xl text-white shadow-sm ${compact ? "h-[92px] w-[66px] p-2.5" : "h-[174px] w-[124px] p-4"}`} style={{ background: "linear-gradient(145deg, " + book.color + ", #172c23)" }}>
    <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full border border-white/15" />
    <div className="absolute -bottom-8 -left-7 h-24 w-24 rounded-full border border-white/15" />
    <BookOpen className={compact ? "h-4 w-4 text-white/85" : "h-6 w-6 text-white/85"} strokeWidth={1.4} />
    <div className="relative z-10"><p className={`font-display leading-tight ${compact ? "line-clamp-2 text-[10px]" : "line-clamp-3 text-base"}`}>{book.title}</p>{!compact && <p className="mt-2 line-clamp-1 text-[10px] text-white/65">{book.author}</p>}</div>
  </div>;
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}><div className="h-full rounded-full bg-forest-500 transition-all duration-500" style={{ width: Math.min(100, Math.max(0, value)) + "%" }} /></div>;
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof BookOpen; label: string; value: string; detail: string }) {
  return <div className="stat-card"><div className="flex items-center justify-between"><span className="stat-icon"><Icon size={18} strokeWidth={1.8} /></span><span className="text-[11px] font-medium text-slate-400">{detail}</span></div><p className="mt-5 text-2xl font-semibold tracking-tight text-ink">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}

function BookForm({ onClose, onSave }: { onClose: () => void; onSave: (book: Book) => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [total, setTotal] = useState("240");
  const [read, setRead] = useState("0");
  const [status, setStatus] = useState<BookStatus>("reading");
  const [color, setColor] = useState(colors[0]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const pages = Math.max(1, Number(total));
    const pagesRead = status === "finished" ? pages : Math.min(pages, Math.max(0, Number(read)));
    const finalStatus = pagesRead >= pages ? "finished" : status;
    const now = new Date().toISOString();
    onSave({ id: crypto.randomUUID(), title: title.trim(), author: author.trim() || "Autor não informado", totalPages: pages, pagesRead, status: finalStatus, color, createdAt: now, startedAt: status === "reading" ? now : undefined, finishedAt: finalStatus === "finished" ? now : undefined });
  }

  return <Modal title="Adicionar livro" description="Inclua um livro na sua biblioteca." onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <label className="field-label">Nome do livro<input autoFocus required maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Hábitos Atômicos" className="field-input" /></label>
      <label className="field-label">Autor<input maxLength={70} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nome do autor" className="field-input" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">Total de páginas<input required type="number" min="1" max="100000" value={total} onChange={(e) => setTotal(e.target.value)} className="field-input" /></label>
        <label className="field-label">Já li<input required type="number" min="0" max={total || 100000} value={read} onChange={(e) => setRead(e.target.value)} className="field-input" disabled={status === "finished"} /></label>
      </div>
      <label className="field-label">Status<select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)} className="field-input"><option value="reading">Estou lendo</option><option value="want-to-read">Quero ler</option><option value="finished">Concluído</option></select></label>
      <div><p className="field-label mb-2">Cor da capa</p><div className="flex gap-2">{colors.map((c) => <button key={c} type="button" onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-ink ring-2 ring-forest-200" : "border-white"}`} style={{ backgroundColor: c }} aria-label={"Selecionar cor " + c} />)}</div></div>
      <button className="primary-button w-full justify-center" type="submit"><Plus size={17} /> Adicionar à biblioteca</button>
    </form>
  </Modal>;
}

function SessionForm({ book, onClose, onSave }: { book: Book; onClose: () => void; onSave: (data: { minutes: number; pagesRead: number; note: string }) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [manual, setManual] = useState("20");
  const [pages, setPages] = useState("5");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const timer = String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0");
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({ minutes: elapsed > 0 ? Math.max(1, Math.round(elapsed / 60)) : Math.max(1, Number(manual)), pagesRead: Math.max(0, Math.min(book.totalPages - book.pagesRead, Number(pages))), note: note.trim() });
  }
  return <Modal title="Hora de ler" description={book.title} onClose={onClose}>
    <form onSubmit={submit} className="space-y-5">
      <div className="timer-card">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-forest-700/70">Sua sessão de leitura</p>
        <div className="my-3 font-display text-6xl tracking-tight text-forest-900">{timer}</div>
        <p className="text-sm text-forest-800/65">{running ? "Concentre-se na leitura. O tempo está contando." : "Quando estiver pronto, inicie seu cronômetro."}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" className="timer-button" onClick={() => setRunning((v) => !v)}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? "Pausar" : elapsed > 0 ? "Continuar" : "Começar"}</button>
          <button type="button" className="timer-reset" onClick={() => { setRunning(false); setElapsed(0); }}><TimerReset size={17} /> Reiniciar</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">Páginas lidas<input type="number" min="0" max={book.totalPages - book.pagesRead} value={pages} onChange={(e) => setPages(e.target.value)} className="field-input" /><span className="field-hint">{book.totalPages - book.pagesRead} páginas restantes</span></label>
        <label className="field-label">Minutos (manual)<input type="number" min="1" max="1440" value={manual} onChange={(e) => setManual(e.target.value)} disabled={elapsed > 0} className="field-input disabled:opacity-50" /><span className="field-hint">{elapsed > 0 ? "Usando o cronômetro" : "Caso não use o cronômetro"}</span></label>
      </div>
      <label className="field-label">Nota da leitura <span className="font-normal text-slate-400">(opcional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={240} placeholder="Uma ideia ou trecho que chamou sua atenção..." className="field-input resize-none" /></label>
      <button className="primary-button w-full justify-center" type="submit"><Check size={17} /> Salvar sessão</button>
    </form>
  </Modal>;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 text-forest-700"><BookOpen size={29} strokeWidth={1.5} /></div><h3 className="mt-5 font-display text-2xl text-ink">Toda jornada começa na primeira página.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Adicione o livro que está na sua cabeceira e acompanhe cada pequeno avanço. Seu ritmo, suas conquistas.</p><button onClick={onAdd} className="primary-button mt-6"><Plus size={17} /> Adicionar meu primeiro livro</button></div>;
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData() as AppData);
  const [tab, setTab] = useState<Tab>("home");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showBookForm, setShowBookForm] = useState(false);
  const [sessionBook, setSessionBook] = useState<Book | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => saveData(data), [data]);

  const today = dateKey();
  const todaySessions = data.sessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  const todayPages = todaySessions.reduce((sum, s) => sum + s.pagesRead, 0);
  const finished = data.books.filter((b) => b.status === "finished");
  const reading = data.books.filter((b) => b.status === "reading");
  const pagesTotal = data.books.reduce((sum, b) => sum + b.pagesRead, 0);
  const streak = streakCount(data.sessions.map((s) => s.date));
  const year = new Date().getFullYear();
  const annualDone = finished.filter((b) => (b.finishedAt || b.createdAt).startsWith(String(year))).length;
  const dailyPct = Math.min(100, todayMinutes / Math.max(1, data.goals.dailyMinutes) * 100);
  const current = reading[0] || null;
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = dateKey(d);
    return { key, label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", ""), minutes: data.sessions.filter((s) => s.date === key).reduce((n, s) => n + s.minutes, 0) };
  }), [data.sessions]);
  const weekMax = Math.max(30, ...week.map((d) => d.minutes));
  const filteredBooks = data.books.filter((b) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const q = search.trim().toLowerCase();
    return matchesFilter && (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  });

  function notify(message: string) { setNotice(message); }
  function addBook(book: Book) {
    setData((d) => ({ ...d, books: [book, ...d.books] }));
    setShowBookForm(false); notify("Livro adicionado à sua biblioteca.");
  }
  function startBook(book: Book) {
    if (book.status === "want-to-read") {
      const started = { ...book, status: "reading" as const, startedAt: new Date().toISOString() };
      setData((d) => ({ ...d, books: d.books.map((b) => b.id === book.id ? started : b) }));
      setSessionBook(started);
    } else setSessionBook(book);
  }
  function saveSession(input: { minutes: number; pagesRead: number; note: string }) {
    if (!sessionBook) return;
    const now = new Date();
    const nextPages = Math.min(sessionBook.totalPages, sessionBook.pagesRead + input.pagesRead);
    const nextStatus: BookStatus = nextPages >= sessionBook.totalPages ? "finished" : "reading";
    const session: ReadingSession = { id: crypto.randomUUID(), bookId: sessionBook.id, date: dateKey(now), minutes: input.minutes, pagesRead: input.pagesRead, note: input.note || undefined };
    setData((d) => ({
      ...d,
      books: d.books.map((b) => b.id === sessionBook.id ? { ...b, pagesRead: nextPages, status: nextStatus, startedAt: b.startedAt || now.toISOString(), finishedAt: nextStatus === "finished" ? now.toISOString() : undefined } : b),
      sessions: [session, ...d.sessions]
    }));
    setSessionBook(null);
    notify(nextStatus === "finished" ? "Livro concluído. Parabéns pela conquista!" : "Sessão registrada. Cada página conta.");
  }
  function removeBook(book: Book) {
    if (!window.confirm("Remover " + book.title + " da sua biblioteca? As sessões desse livro também serão removidas.")) return;
    setData((d) => ({ ...d, books: d.books.filter((b) => b.id !== book.id), sessions: d.sessions.filter((s) => s.bookId !== book.id) }));
    notify("Livro removido.");
  }
  function setGoal(key: "dailyMinutes" | "annualBooks", value: number) {
    setData((d) => ({ ...d, goals: { ...d.goals, [key]: Math.max(1, Math.min(999, value || 1)) } }));
  }
  function navigate(next: Tab) { setTab(next); setSearch(""); }

  const nav = [
    { id: "home" as const, label: "Visão geral", mobile: "Início", icon: House },
    { id: "library" as const, label: "Minha biblioteca", mobile: "Biblioteca", icon: Library },
    { id: "goals" as const, label: "Metas e evolução", mobile: "Metas", icon: Target }
  ];

  return <div className="min-h-screen bg-paper text-ink">
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => navigate("home")}><span className="brand-mark"><BookOpen size={21} strokeWidth={1.7} /></span><span className="font-display text-[25px] font-semibold tracking-tight">readly<span className="text-forest-500">.</span></span></button>
      <div className="mt-12"><p className="sidebar-label">MENU</p><nav className="mt-3 space-y-1">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => navigate(item.id)} className={`nav-item ${tab === item.id ? "nav-item-active" : ""}`}><Icon size={18} strokeWidth={1.8} />{item.label}{tab === item.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-forest-600" />}</button>; })}</nav></div>
      <div className="sidebar-quote"><Sparkles size={17} className="text-forest-600" /><p className="mt-3 font-display text-lg leading-snug text-forest-900">“Um livro é um sonho que você segura nas mãos.”</p><p className="mt-2 text-xs text-forest-700/70">Neil Gaiman</p></div>
      <div className="sidebar-bottom"><div className="flex items-center gap-3 rounded-xl bg-white/70 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-800">R</div><div className="min-w-0"><p className="text-sm font-semibold text-ink">Leitor Readly</p><p className="text-xs text-slate-400">Sua jornada começa aqui</p></div></div><p className="mt-3 px-2 text-[10px] leading-4 text-slate-400">MVP · Dados salvos neste navegador.</p></div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="flex items-center gap-2 md:hidden"><span className="brand-mark !h-9 !w-9"><BookOpen size={18} /></span><span className="font-display text-xl font-semibold">readly<span className="text-forest-500">.</span></span></div>
        <div className="hidden text-sm capitalize text-slate-400 md:block">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="search-box hidden sm:flex"><Search size={16} /><input aria-label="Buscar livro" placeholder="Buscar na biblioteca..." value={search} onChange={(e) => { setSearch(e.target.value); setTab("library"); }} />{search && <button onClick={() => setSearch("")} aria-label="Limpar busca"><X size={14} /></button>}</label>
          <button className="primary-button !px-3 sm:!px-4" onClick={() => setShowBookForm(true)}><Plus size={17} /><span className="hidden sm:inline">Adicionar livro</span><span className="sm:hidden">Adicionar</span></button>
        </div>
      </header>

      {notice && <div className="toast-note" role="status"><Check size={16} />{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso"><X size={15} /></button></div>}

      {tab === "home" && <div className="page-wrap">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p><h1 className="page-title">{new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"}, leitor<span className="text-forest-500">.</span></h1><p className="mt-2 text-sm text-slate-500">Um pouco de leitura hoje já é um passo adiante.</p></div><div className="flex items-center gap-2 rounded-full border border-forest-100 bg-white px-3 py-2 text-xs font-medium text-forest-800"><Flame size={15} className="text-orange-500" />{streak} {streak === 1 ? "dia de ritmo" : "dias de ritmo"}</div></section>
        <section className="hero-card"><div className="relative z-10 max-w-xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/80"><Sparkles size={13} /> SEU ESPAÇO DE LEITURA</div><h2 className="mt-5 max-w-lg font-display text-3xl leading-tight text-white sm:text-[38px]">Cada página lida é uma história que fica com você.</h2><p className="mt-3 max-w-md text-sm leading-6 text-white/65">Crie seu ritmo, celebre pequenas conquistas e transforme a leitura em parte dos seus dias.</p><button onClick={() => current ? startBook(current) : setShowBookForm(true)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#edf4ed] px-4 py-2.5 text-sm font-semibold text-forest-900 transition hover:bg-white">{current ? <><Timer size={16} />Continuar lendo</> : <><Plus size={16} />Adicionar primeiro livro</>}<ArrowRight size={15} /></button></div><div className="hero-decoration" aria-hidden="true"><div className="hero-book hero-book-one"><BookOpen size={30} /></div><div className="hero-book hero-book-two"><Bookmark size={26} /></div><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /></div></section>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={BookMarked} label="Livros concluídos" value={String(finished.length)} detail={data.books.length + " na biblioteca"} />
          <Stat icon={BookOpen} label="Páginas lidas" value={pagesTotal.toLocaleString("pt-BR")} detail="no total" />
          <Stat icon={Clock3} label="Tempo de leitura" value={formatMinutes(data.sessions.reduce((n, s) => n + s.minutes, 0))} detail="acumulado" />
          <Stat icon={Flame} label="Sequência atual" value={String(streak)} detail={streak === 1 ? "dia" : "dias"} />
        </section>
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
          <section className="surface-card"><div className="flex items-center justify-between"><div><h3 className="section-title">Seu livro atual</h3><p className="section-subtitle">Continue de onde você parou.</p></div><button onClick={() => navigate("library")} className="text-link">Ver biblioteca <ChevronRight size={15} /></button></div>
            {current ? <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center"><Cover book={current} /><div className="min-w-0 flex-1"><span className="status-pill status-reading">LENDO AGORA</span><h4 className="mt-3 font-display text-2xl leading-tight text-ink">{current.title}</h4><p className="mt-1 text-sm text-slate-500">{current.author}</p><div className="mt-5 flex items-center justify-between text-xs text-slate-500"><span>{current.pagesRead} de {current.totalPages} páginas</span><span className="font-semibold text-forest-700">{Math.round(current.pagesRead / current.totalPages * 100)}%</span></div><Progress value={current.pagesRead / current.totalPages * 100} className="mt-2" /><button onClick={() => startBook(current)} className="secondary-button mt-5"><Play size={15} /> Registrar leitura</button></div></div> : <div className="mt-6 rounded-xl border border-dashed border-forest-200 bg-forest-50/50 px-5 py-8 text-center"><BookOpen className="mx-auto text-forest-500" size={25} strokeWidth={1.5} /><p className="mt-3 text-sm font-semibold text-ink">Nenhuma leitura em andamento</p><p className="mt-1 text-xs text-slate-500">Adicione seu livro atual para acompanhar o progresso.</p><button onClick={() => setShowBookForm(true)} className="text-link mx-auto mt-3">Adicionar livro <ArrowRight size={14} /></button></div>}
          </section>
          <section className="surface-card"><div className="flex items-center justify-between"><div><h3 className="section-title">Meta de hoje</h3><p className="section-subtitle">Pequenos passos, todos os dias.</p></div><span className="goal-icon"><Target size={18} /></span></div><div className="mt-7 flex items-end gap-2"><span className="font-display text-5xl text-ink">{todayMinutes}</span><span className="mb-1 text-sm text-slate-400">/ {data.goals.dailyMinutes} min</span></div><Progress value={dailyPct} className="mt-4 h-2.5" /><p className="mt-3 text-xs text-slate-500">{dailyPct >= 100 ? "Meta diária alcançada. Excelente!" : "Faltam " + Math.max(0, data.goals.dailyMinutes - todayMinutes) + " minutos para sua meta."}</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5"><div><p className="text-xl font-semibold text-ink">{todayPages}</p><p className="text-xs text-slate-400">páginas hoje</p></div><div><p className="text-xl font-semibold text-ink">{todaySessions.length}</p><p className="text-xs text-slate-400">{todaySessions.length === 1 ? "sessão hoje" : "sessões hoje"}</p></div></div></section>
        </div>
        <section className="surface-card mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="section-title">Seu ritmo nesta semana</h3><p className="section-subtitle">Minutos dedicados à leitura nos últimos sete dias.</p></div><div className="flex items-center gap-2 text-xs text-forest-700"><span className="h-2 w-2 rounded-full bg-forest-500" />Minutos lidos</div></div><div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4">{week.map((day) => <div key={day.key} className="flex flex-col items-center gap-2"><div className="flex h-28 w-full items-end justify-center rounded-lg bg-forest-50/70 p-1.5 sm:p-2"><div className="w-full rounded-md bg-forest-500 transition-all" style={{ height: (day.minutes ? Math.max(7, day.minutes / weekMax * 100) : 4) + "%", opacity: day.minutes ? 1 : .18 }} /></div><span className="text-[10px] font-medium capitalize text-slate-400 sm:text-xs">{day.label}</span><span className="text-[10px] text-slate-400">{day.minutes ? day.minutes + "m" : "—"}</span></div>)}</div></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="soft-card flex items-start gap-4"><div className="soft-icon"><Award size={20} /></div><div><p className="text-sm font-semibold text-ink">Sua meta anual</p><p className="mt-1 text-xs leading-5 text-slate-500">{annualDone} de {data.goals.annualBooks} livros concluídos em {year}.</p><Progress value={annualDone / data.goals.annualBooks * 100} className="mt-3" /></div></div><div className="soft-card flex items-start gap-4"><div className="soft-icon"><Activity size={20} /></div><div><p className="text-sm font-semibold text-ink">Um hábito de cada vez</p><p className="mt-1 text-xs leading-5 text-slate-500">{data.sessions.length ? "Você já registrou " + data.sessions.length + " sessões de leitura. Continue assim." : "Registre sua primeira sessão e comece a acompanhar sua evolução."}</p></div></div></section>
      </div>}

      {tab === "library" && <div className="page-wrap"><section className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">SEU ACERVO PESSOAL</p><h1 className="page-title">Minha biblioteca<span className="text-forest-500">.</span></h1><p className="mt-2 text-sm text-slate-500">{data.books.length} {data.books.length === 1 ? "livro guardado" : "livros guardados"} na sua jornada.</p></div><button onClick={() => setShowBookForm(true)} className="primary-button"><Plus size={17} />Adicionar livro</button></section>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2">{([["all","Todos"],["reading","Lendo"],["want-to-read","Quero ler"],["finished","Concluídos"]] as [Filter,string][]).map(([v,label]) => <button key={v} onClick={() => setFilter(v)} className={`filter-chip ${filter === v ? "filter-chip-active" : ""}`}>{label} {v === "all" ? data.books.length : data.books.filter((b) => b.status === v).length}</button>)}</div><label className="search-box sm:hidden"><Search size={16} /><input placeholder="Buscar livro ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><ListFilter size={14} />Organize seu ritmo de leitura</div></div>
        {data.books.length === 0 ? <EmptyState onAdd={() => setShowBookForm(true)} /> : filteredBooks.length === 0 ? <div className="surface-card py-14 text-center"><Search className="mx-auto text-slate-300" size={26} /><p className="mt-3 text-sm font-semibold text-ink">Nenhum livro encontrado</p><p className="mt-1 text-xs text-slate-400">Tente outro termo ou filtro.</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredBooks.map((book) => { const pct = Math.round(book.pagesRead / book.totalPages * 100); return <article key={book.id} className="book-card"><div className="flex gap-4"><Cover book={book} compact /><div className="min-w-0 flex-1 py-1"><span className={`status-pill ${book.status === "reading" ? "status-reading" : book.status === "finished" ? "status-finished" : "status-want"}`}>{statusLabels[book.status]}</span><h3 className="mt-2 line-clamp-2 font-display text-lg leading-tight text-ink">{book.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{book.author}</p><p className="mt-3 text-[11px] text-slate-400">{book.pagesRead} / {book.totalPages} páginas</p></div></div><div className="mt-4"><div className="mb-2 flex justify-between text-[11px]"><span className="text-slate-400">Progresso</span><span className="font-semibold text-forest-700">{pct}%</span></div><Progress value={pct} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">{book.status !== "finished" ? <button onClick={() => startBook(book)} className="text-link">{book.status === "reading" ? "Registrar leitura" : "Começar leitura"} <ArrowRight size={14} /></button> : <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-700"><Check size={14} />Finalizado</span>}<button onClick={() => removeBook(book)} className="quiet-button" aria-label={"Remover " + book.title} title="Remover livro"><X size={15} /></button></div></article>; })}</div>}
      </div>}

      {tab === "goals" && <div className="page-wrap"><section className="mb-8"><p className="eyebrow">CONSTÂNCIA ACIMA DA PRESSA</p><h1 className="page-title">Metas e evolução<span className="text-forest-500">.</span></h1><p className="mt-2 text-sm text-slate-500">Defina um ritmo possível e acompanhe sua caminhada.</p></section>
        <div className="grid gap-5 lg:grid-cols-2"><section className="surface-card"><span className="goal-icon"><Clock3 size={19} /></span><h3 className="mt-4 section-title">Meta diária de leitura</h3><p className="section-subtitle">Quanto tempo você quer reservar para ler por dia?</p><div className="mt-6 flex items-center gap-3"><input aria-label="Meta diária em minutos" type="number" min="1" max="999" value={data.goals.dailyMinutes} onChange={(e) => setGoal("dailyMinutes", Number(e.target.value))} className="goal-input" /><span className="text-sm text-slate-500">minutos por dia</span></div><div className="mt-6 rounded-xl bg-forest-50 p-4"><div className="flex justify-between text-xs"><span className="font-medium text-forest-800">Progresso de hoje</span><span className="font-semibold text-forest-800">{Math.round(dailyPct)}%</span></div><Progress value={dailyPct} className="mt-3 bg-white" /><p className="mt-2 text-xs text-forest-700/70">{todayMinutes} de {data.goals.dailyMinutes} minutos cumpridos.</p></div></section>
        <section className="surface-card"><span className="goal-icon"><BookMarked size={19} /></span><h3 className="mt-4 section-title">Desafio anual</h3><p className="section-subtitle">Quantos livros você gostaria de concluir neste ano?</p><div className="mt-6 flex items-center gap-3"><input aria-label="Meta anual de livros" type="number" min="1" max="999" value={data.goals.annualBooks} onChange={(e) => setGoal("annualBooks", Number(e.target.value))} className="goal-input" /><span className="text-sm text-slate-500">livros em {year}</span></div><div className="mt-6 rounded-xl bg-forest-50 p-4"><div className="flex justify-between text-xs"><span className="font-medium text-forest-800">Livros concluídos</span><span className="font-semibold text-forest-800">{annualDone} / {data.goals.annualBooks}</span></div><Progress value={annualDone / data.goals.annualBooks * 100} className="mt-3 bg-white" /><p className="mt-2 text-xs text-forest-700/70">{Math.max(0, data.goals.annualBooks - annualDone)} livros para alcançar sua meta.</p></div></section></div>
        <section className="surface-card mt-5"><div className="flex items-center justify-between"><div><h3 className="section-title">Seu histórico de leitura</h3><p className="section-subtitle">Um registro por dia em que você leu.</p></div><CalendarDays className="text-forest-600" size={20} /></div><div className="mt-6 grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-14">{Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (34-i)); const key = dateKey(d); const mins = data.sessions.filter((s) => s.date === key).reduce((n,s) => n+s.minutes,0); return <div key={key} title={key + ": " + mins + " minutos"} className={`aspect-square rounded-md ${mins >= 45 ? "bg-forest-700" : mins >= 20 ? "bg-forest-500" : mins > 0 ? "bg-forest-200" : "bg-slate-100"}`} />; })}</div><div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-slate-400"><span>Menos</span><span className="h-3 w-3 rounded-sm bg-slate-100" /><span className="h-3 w-3 rounded-sm bg-forest-200" /><span className="h-3 w-3 rounded-sm bg-forest-500" /><span className="h-3 w-3 rounded-sm bg-forest-700" /><span>Mais</span></div></section>
        <section className="surface-card mt-5"><h3 className="section-title">Últimas sessões</h3><p className="section-subtitle">Suas leituras recentes, registradas em um só lugar.</p>{data.sessions.length ? <div className="mt-4 divide-y divide-slate-100">{data.sessions.slice(0,8).map((s) => { const book = data.books.find((b) => b.id === s.bookId); return <div key={s.id} className="flex items-center gap-3 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><BookOpen size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{book?.title || "Livro removido"}</p><p className="text-xs text-slate-400">{new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"short" }).format(new Date(s.date + "T12:00:00"))} · {s.pagesRead} páginas</p></div><span className="text-sm font-semibold text-forest-700">{formatMinutes(s.minutes)}</span></div>; })}</div> : <div className="py-10 text-center text-sm text-slate-400">Suas sessões aparecerão aqui quando você começar a ler.</div>}</section>
      </div>}

      <footer className="page-footer"><span>readly<span className="text-forest-500">.</span> <span className="text-slate-400">Leia no seu ritmo.</span></span><span>Feito para valorizar cada página.</span></footer>
    </main>

    <nav className="mobile-nav md:hidden">{nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => navigate(item.id)} className={`mobile-nav-item ${tab === item.id ? "mobile-nav-active" : ""}`}><Icon size={19} /><span>{item.mobile}</span></button>; })}</nav>
    {showBookForm && <BookForm onClose={() => setShowBookForm(false)} onSave={addBook} />}
    {sessionBook && <SessionForm book={sessionBook} onClose={() => setSessionBook(null)} onSave={saveSession} />}
  </div>;
}
