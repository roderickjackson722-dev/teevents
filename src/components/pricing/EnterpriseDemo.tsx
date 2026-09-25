import { useMemo, useState } from "react";
import { MapPin, Trophy, Smartphone, Flag, Minus, Plus } from "lucide-react";

const PARS = [4, 5, 3, 4, 4, 3, 5, 4, 4];
const START: Record<string, number[]> = {
  "Mike Johnson": [4, 5, 2, 4, 5, 3, 4, 0, 0],
  "Sarah Lee": [5, 4, 3, 4, 4, 3, 5, 4, 0],
  "David Kim": [4, 6, 3, 3, 4, 3, 5, 0, 0],
  "Chris Evans": [5, 5, 4, 4, 4, 2, 5, 4, 3],
};

type Tab = "course" | "leaderboard" | "scoring";

const EnterpriseDemo = () => {
  const [tab, setTab] = useState<Tab>("course");
  const [scores, setScores] = useState(START);
  const [player, setPlayer] = useState("Mike Johnson");
  const [hole, setHole] = useState(7);

  const board = useMemo(
    () =>
      Object.entries(scores)
        .map(([name, s]) => {
          const played = s.filter((x) => x > 0).length;
          const toPar = s.reduce((a, x, i) => (x > 0 ? a + x - PARS[i] : a), 0);
          return { name, played, toPar };
        })
        .sort((a, b) => a.toPar - b.toPar),
    [scores],
  );

  const cur = scores[player][hole] || PARS[hole];
  const setScore = (v: number) =>
    setScores((prev) => ({ ...prev, [player]: prev[player].map((x, i) => (i === hole ? Math.max(1, Math.min(12, v)) : x)) }));

  const fmt = (n: number) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);
  const tabs: { id: Tab; label: string; icon: typeof MapPin }[] = [
    { id: "course", label: "Course Page", icon: MapPin },
    { id: "leaderboard", label: "Live Leaderboard", icon: Trophy },
    { id: "scoring", label: "Mobile Scoring", icon: Smartphone },
  ];

  return (
    <div className="max-w-5xl mx-auto mt-10 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-primary px-6 py-4 text-center">
        <p className="text-xs uppercase tracking-widest text-secondary font-bold">Try the Enterprise demo</p>
        <p className="text-primary-foreground font-display text-xl">Pinehurst Ridge Golf Club — Member-Guest Classic</p>
      </div>
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold ${tab === t.id ? "border-b-2 border-secondary text-primary bg-secondary/10" : "text-muted-foreground"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "course" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-display text-2xl font-bold text-foreground mb-2">Pinehurst Ridge Golf Club</h4>
              <p className="text-muted-foreground text-sm mb-4">Your club's own branded page listing every tournament and league for the season — registration, sponsors and results in one place.</p>
              <ul className="space-y-2 text-sm">
                {["Member-Guest Classic — Oct 12", "Tuesday Night Men's League — Weekly", "Ladies 9-Hole League — Weekly", "Club Championship — Nov 2"].map((e) => (
                  <li key={e} className="flex items-center gap-2 rounded-md border border-border p-3 text-foreground"><Flag className="h-4 w-4 text-secondary" /> {e}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Front nine</p>
              <div className="grid grid-cols-9 gap-1 text-center text-xs">
                {PARS.map((p, i) => (
                  <div key={i} className="rounded bg-muted p-2"><div className="font-bold text-foreground">{i + 1}</div><div className="text-muted-foreground">Par {p}</div></div>
                ))}
              </div>
              <button onClick={() => setTab("leaderboard")} className="mt-6 w-full rounded-md bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">View live leaderboard</button>
            </div>
          </div>
        )}

        {tab === "leaderboard" && (
          <div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="p-2">Pos</th><th className="p-2">Player</th><th className="p-2 text-center">Thru</th><th className="p-2 text-right">To Par</th></tr></thead>
              <tbody>
                {board.map((r, i) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="p-2 font-bold text-primary">{i + 1}</td>
                    <td className="p-2 text-foreground">{r.name}</td>
                    <td className="p-2 text-center text-muted-foreground">{r.played}</td>
                    <td className={`p-2 text-right font-bold ${r.toPar < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(r.toPar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted-foreground text-center">Enter a score in the Mobile Scoring tab and watch this update instantly.</p>
          </div>
        )}

        {tab === "scoring" && (
          <div className="mx-auto max-w-xs rounded-2xl border-4 border-primary p-4">
            <select value={player} onChange={(e) => setPlayer(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-sm mb-3">
              {Object.keys(scores).map((n) => <option key={n}>{n}</option>)}
            </select>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setHole((h) => Math.max(0, h - 1))} className="text-sm text-muted-foreground">‹ Prev</button>
              <p className="font-bold text-foreground">Hole {hole + 1} · Par {PARS[hole]}</p>
              <button onClick={() => setHole((h) => Math.min(8, h + 1))} className="text-sm text-muted-foreground">Next ›</button>
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <button onClick={() => setScore(cur - 1)} className="rounded-full bg-muted p-3"><Minus className="h-5 w-5" /></button>
              <span className="text-5xl font-display font-bold text-primary">{cur}</span>
              <button onClick={() => setScore(cur + 1)} className="rounded-full bg-muted p-3"><Plus className="h-5 w-5" /></button>
            </div>
            <button onClick={() => { setScore(cur); setHole((h) => Math.min(8, h + 1)); }} className="w-full rounded-md bg-secondary py-3 text-sm font-semibold text-secondary-foreground">Save & Next Hole</button>
            <button onClick={() => setTab("leaderboard")} className="mt-2 w-full text-xs text-muted-foreground underline">See leaderboard</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseDemo;
