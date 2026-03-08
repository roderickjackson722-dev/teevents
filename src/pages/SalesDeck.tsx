import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Globe,
  Users,
  Trophy,
  DollarSign,
  BarChart3,
  QrCode,
  MessageSquare,
  ShoppingBag,
  Gavel,
  Camera,
  ClipboardList,
  Heart,
  UserCheck,
  Zap,
  Shield,
  ArrowRight,
  Check,
  Timer,
  Printer,
  FileText,
} from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import salesHero from "@/assets/sales-hero.jpg";
import salesCheckin from "@/assets/sales-checkin.jpg";
import salesScoring from "@/assets/sales-scoring.jpg";
import demoWebsite from "@/assets/demo-website-builder.jpg";
import demoRegistration from "@/assets/demo-registration.jpg";
import demoPairings from "@/assets/demo-pairings.jpg";
import demoBudget from "@/assets/demo-budget.jpg";
import demoMessaging from "@/assets/demo-messaging.jpg";
import demoSponsors from "@/assets/demo-sponsors.jpg";
import { slides } from "@/components/sales-deck/slideData";
import { SlideRenderer } from "@/components/sales-deck/SlideRenderer";

// ── Scaled Slide Wrapper ────────────────────────────────────
function ScaledSlide({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const scaleX = parent.clientWidth / 1920;
      const scaleY = parent.clientHeight / 1080;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => {
      window.removeEventListener("resize", updateScale);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute"
      style={{
        width: 1920,
        height: 1080,
        left: "50%",
        top: "50%",
        marginLeft: -960,
        marginTop: -540,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
}

// ── Main Deck ───────────────────────────────────────────────
export default function SalesDeck() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, slides.length - 1)), []);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F5") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "Escape" && isFullscreen) document.exitFullscreen?.();
    };
    window.addEventListener("keydown", handler);
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fsHandler);
    return () => { window.removeEventListener("keydown", handler); document.removeEventListener("fullscreenchange", fsHandler); };
  }, [next, prev, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center select-none">
      {/* Slide container */}
      <div className="relative w-full" style={{ maxWidth: "min(100vw, 177.78vh)", aspectRatio: "16/9" }}>
        <div className="absolute inset-0 overflow-hidden rounded-lg shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div key={current} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <ScaledSlide>
                <SlideRenderer slide={slides[current]} />
              </ScaledSlide>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation overlay */}
        <div className="absolute inset-0 flex z-10">
          <button onClick={prev} className="w-1/3 h-full cursor-w-resize opacity-0" aria-label="Previous" />
          <div className="w-1/3 h-full" />
          <button onClick={next} className="w-1/3 h-full cursor-e-resize opacity-0" aria-label="Next" />
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-4 mt-4 text-white/60">
        <button onClick={prev} disabled={current === 0} className="p-2 hover:text-white disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-mono">{current + 1} / {slides.length}</span>
        <button onClick={next} disabled={current === slides.length - 1} className="p-2 hover:text-white disabled:opacity-30 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button onClick={toggleFullscreen} className="p-2 hover:text-white transition-colors ml-4">
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Slide thumbnails */}
      {!isFullscreen && (
        <div className="flex gap-2 mt-4 px-4 overflow-x-auto max-w-full pb-4">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => setCurrent(i)} className={`flex-shrink-0 w-16 h-9 rounded border-2 text-[6px] font-bold flex items-center justify-center transition-all ${i === current ? "border-primary bg-primary/20 text-white" : "border-white/20 text-white/40 hover:border-white/40"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
