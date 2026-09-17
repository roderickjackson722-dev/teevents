import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_GUIDES, ADMIN_GUIDE_CATEGORIES, type AdminGuide } from "@/lib/adminStepByStep";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Printer,
  Search,
} from "lucide-react";

const StepByStepInstructions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(["tax-deductible-receipts"]);
  const [expanded, setExpanded] = useState<string[]>(["tax-deductible-receipts"]);

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-login");
        return;
      }
      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!data) {
        navigate("/");
        return;
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_GUIDES;
    return ADMIN_GUIDES.filter((g) =>
      `${g.title} ${g.summary} ${g.category} ${g.path}`.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  const shown: AdminGuide[] = ADMIN_GUIDES.filter((g) => selected.includes(g.key));

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">
          Loading instructions…
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-10 max-w-5xl">
        <button
          onClick={() => navigate("/admin")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Step-by-Step Instructions
            </h1>
            <p className="text-muted-foreground mt-1">
              Pick the walkthroughs you need. Each one includes screenshots of the real screens.
            </p>
          </div>
          <Button variant="outline" className="gap-2 self-start" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print selected
          </Button>
        </div>

        {/* Picker */}
        <div className="bg-muted/40 border border-border rounded-xl p-5 mb-10 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-foreground">Choose what you want to see</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search instructions"
                  className="pl-8 w-56"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(ADMIN_GUIDES.map((g) => g.key))}
              >
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            {ADMIN_GUIDE_CATEGORIES.map((cat) => {
              const guides = filtered.filter((g) => g.category === cat);
              if (guides.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-2">
                    {cat}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {guides.map((g) => (
                      <label
                        key={g.key}
                        className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors"
                      >
                        <Checkbox
                          checked={selected.includes(g.key)}
                          onCheckedChange={() => setSelected((s) => toggle(s, g.key))}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-semibold text-foreground text-sm">
                            {g.title}
                          </span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {g.summary}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected instructions */}
        {shown.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
            Check one or more items above to see the instructions.
          </div>
        ) : (
          <div className="space-y-6">
            {shown.map((g) => {
              const open = expanded.includes(g.key);
              return (
                <article key={g.key} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded((e) => toggle(e, g.key))}
                    className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">
                        {g.category}
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground mt-1">
                        {g.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">{g.summary}</p>
                      <p className="text-xs text-primary mt-2">{g.path}</p>
                    </div>
                    {open ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {open && (
                    <div className="px-5 pb-6 space-y-6 border-t border-border pt-5">
                      <ol className="space-y-6">
                        {g.steps.map((s, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-foreground/90">{s.text}</p>
                              {s.image && (
                                <figure className="mt-3">
                                  <img
                                    src={s.image}
                                    alt={s.imageCaption || s.text}
                                    className="w-full rounded-lg border border-border shadow-sm"
                                    loading="lazy"
                                  />
                                  {s.imageCaption && (
                                    <figcaption className="text-xs text-muted-foreground mt-1.5">
                                      {s.imageCaption}
                                    </figcaption>
                                  )}
                                </figure>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>

                      {g.tips && g.tips.length > 0 && (
                        <div className="bg-muted/40 rounded-lg p-4">
                          <h3 className="font-semibold text-foreground mb-2 text-sm">
                            Tips
                          </h3>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
                            {g.tips.map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {g.troubleshooting && g.troubleshooting.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2 text-sm">
                            If something looks wrong
                          </h3>
                          <ul className="space-y-2 text-sm text-foreground/90">
                            {g.troubleshooting.map((c, i) => (
                              <li key={i}>
                                <span className="font-medium">"{c.issue}"</span> — {c.solution}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default StepByStepInstructions;
