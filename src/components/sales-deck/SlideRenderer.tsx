import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import type { slides } from "./slideData";

type Slide = typeof slides[number];

function TitleSlide({ data }: { data: any }) {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full text-center">
      {data.bgImage && <img src={data.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <div className="relative z-10 flex flex-col items-center px-[120px]">
        <motion.img src={logoWhite} alt="TeeVents" className="h-[80px] mb-[40px]" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} />
        <motion.h1 className="text-[72px] font-bold text-white leading-tight drop-shadow-lg whitespace-nowrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {data.heading}
        </motion.h1>
        <motion.p className="text-[36px] text-white/90 mt-[16px] font-light drop-shadow-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {data.subheading || ""}
        </motion.p>
        <motion.p className="text-[22px] text-white/70 mt-[24px] drop-shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          {data.tagline || ""}
        </motion.p>
      </div>
    </div>
  );
}

function BulletsSlide({ data }: { data: any }) {
  const Icon = data.icon;
  return (
    <div className="flex flex-col justify-center w-full h-full px-[120px] py-[60px] bg-card">
      <div className="flex items-center gap-[20px] mb-[40px]">
        <div className="w-[56px] h-[56px] rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: `${data.color}15` }}>
          <Icon className="w-[28px] h-[28px]" style={{ color: data.color }} />
        </div>
        <h2 className="text-[48px] font-bold text-foreground whitespace-nowrap">{data.heading}</h2>
      </div>
      <ul className="space-y-[22px]">
        {data.bullets.map((b: string, i: number) => (
          <motion.li key={i} className="flex items-start gap-[14px]" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
            <ArrowRight className="w-[22px] h-[22px] mt-[3px] flex-shrink-0" style={{ color: data.color }} />
            <span className="text-[24px] text-muted-foreground">{b}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function FeatureSlide({ data }: { data: any }) {
  return (
    <div className="flex flex-row w-full h-full bg-card">
      <div className="flex-1 flex flex-col justify-center px-[80px] py-[60px]">
        <motion.h2 className="text-[44px] font-bold text-foreground mb-[16px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {data.heading}
        </motion.h2>
        <motion.p className="text-[20px] text-muted-foreground mb-[28px] leading-relaxed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {data.description}
        </motion.p>
        <div className="grid grid-cols-2 gap-x-[12px] gap-y-[10px]">
          {data.highlights.map((h: string, i: number) => (
            <motion.div key={i} className="flex items-center gap-[8px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <Check className="w-[18px] h-[18px] text-primary flex-shrink-0" />
              <span className="text-[18px] text-foreground">{h}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="w-[820px] flex items-center justify-center p-[40px]">
        <motion.img src={data.image} alt={data.heading} className="max-w-full max-h-full rounded-[16px] shadow-2xl object-contain" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} />
      </div>
    </div>
  );
}

function IconGridSlide({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-[120px] py-[60px] bg-card text-center">
      <motion.h2 className="text-[46px] font-bold text-foreground mb-[14px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {data.heading}
      </motion.h2>
      <motion.p className="text-[20px] text-muted-foreground mb-[40px] max-w-[900px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {data.description}
      </motion.p>
      <div className="grid grid-cols-3 gap-[28px]">
        {data.gridItems.map((item: any, i: number) => {
          const Icon = item.icon;
          return (
            <motion.div key={i} className="flex flex-col items-center gap-[10px] bg-muted/30 rounded-[14px] p-[28px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
              <Icon className="w-[36px] h-[36px] text-primary" />
              <span className="text-[18px] font-semibold text-foreground">{item.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PricingSlide({ data }: { data: any }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-[60px] py-[40px] bg-card">
      <motion.h2 className="text-[42px] font-bold text-foreground mb-[32px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {data.heading}
      </motion.h2>
      <div className="grid grid-cols-4 gap-[20px] w-full max-w-[1500px]">
        {data.plans.map((plan: any, i: number) => (
          <motion.div key={i} className={`rounded-[14px] p-[24px] border ${plan.popular ? "border-primary bg-primary text-primary-foreground shadow-xl" : "border-border bg-card"}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <h3 className="text-[24px] font-bold">{plan.name}</h3>
            <p className="text-[34px] font-bold mt-[6px]">{plan.price}</p>
            <p className={`text-[14px] font-semibold mt-[4px] ${plan.popular ? "text-primary-foreground/70" : "text-primary"}`}>+ {plan.fee} transaction fee</p>
            <ul className="mt-[18px] space-y-[8px]">
              {plan.highlights.map((h: string, j: number) => (
                <li key={j} className="flex items-start gap-[8px]">
                  <Check className={`w-[14px] h-[14px] mt-[2px] flex-shrink-0 ${plan.popular ? "text-primary-foreground/70" : "text-primary"}`} />
                  <span className={`text-[14px] leading-snug ${plan.popular ? "text-primary-foreground/90" : "text-muted-foreground"}`}>{h}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CTASlide({ data }: { data: any }) {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full text-center">
      {data.bgImage && <img src={data.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <div className="relative z-10 flex flex-col items-center px-[120px]">
        <motion.h2 className="text-[60px] font-bold text-white mb-[20px] drop-shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {data.heading}
        </motion.h2>
        <motion.p className="text-[28px] text-white/80 mb-[48px] drop-shadow-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          {data.subheading}
        </motion.p>
        <motion.a href={data.url} className="inline-flex items-center gap-[12px] bg-secondary text-secondary-foreground px-[48px] py-[20px] rounded-full text-[24px] font-bold hover:bg-secondary/90 transition-colors shadow-xl" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          {data.cta} <ArrowRight className="w-[24px] h-[24px]" />
        </motion.a>
      </div>
    </div>
  );
}

export function SlideRenderer({ slide }: { slide: Slide }) {
  switch (slide.type) {
    case "title": return <TitleSlide data={slide} />;
    case "bullets": return <BulletsSlide data={slide} />;
    case "feature": return <FeatureSlide data={slide} />;
    case "iconGrid": return <IconGridSlide data={slide} />;
    case "pricing": return <PricingSlide data={slide} />;
    case "cta": return <CTASlide data={slide} />;
    default: return null;
  }
}
