import { Clock, MapPin, Users, Eye, Megaphone, BarChart3, PenLine } from "lucide-react";

interface PreviewT {
  title: string;
  course_name?: string | null;
  date?: string | null;
  day_of_show_welcome: boolean;
  day_of_welcome_title: string | null;
  day_of_welcome_message: string | null;
  day_of_bg_color: string | null;
  day_of_accent_color: string | null;
  day_of_font_color: string | null;
  day_of_header_image_url: string | null;
  day_of_announcements_list: string[];
  day_of_announcements?: string | null;
  day_of_show_announcements_card: boolean;
  day_of_show_scores_card: boolean;
  day_of_show_leaderboard_card: boolean;
  day_of_show_coursemap_card: boolean;
  day_of_show_pin_sheets: boolean;
  day_of_show_sponsors: boolean;
  day_of_sponsor_title?: string | null;
  day_of_pin_sheet_pdf_url?: string | null;
  day_of_placeholder_fallback?: string | null;
}

const SAMPLE = {
  name: "Sample Player",
  tee_time: "8:30 AM",
  hole: 1,
  group: 1,
  position: 1,
  code: "PREVIEW",
};

export default function DayOfLivePreview({ t }: { t: PreviewT }) {
  const bg = t.day_of_bg_color || "#1a5c38";
  const accent = t.day_of_accent_color || "#F5A623";
  const fontColor = t.day_of_font_color || "#FFFFFF";

  const fallback = t.day_of_placeholder_fallback || "TBD";
  const fill = (s: string) =>
    (s || "")
      .split("[Tournament Name]").join(t.title || "Your Tournament Name")
      .split("[Player Name]").join(SAMPLE.name)
      .split("[Tee Time]").join(SAMPLE.tee_time || fallback)
      .split("[Starting Hole]").join(`#${SAMPLE.hole}`);

  const DEFAULT_TITLE = "Welcome to [Tournament Name]!";
  const DEFAULT_MSG =
    "Welcome, [Player Name]! You are officially checked in and ready to play. We're thrilled to have you here.\n\nPlease review your tee time and starting hole below.\n\nBest of luck today!";
  const welcomeTitle = fill((t.day_of_welcome_title && t.day_of_welcome_title.trim()) || DEFAULT_TITLE);
  const welcomeMsg = fill((t.day_of_welcome_message && t.day_of_welcome_message.trim()) || DEFAULT_MSG);

  const headerStyle: React.CSSProperties = t.day_of_header_image_url
    ? {
        backgroundImage: `linear-gradient(135deg, ${bg}cc, ${bg}99), url(${t.day_of_header_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: fontColor,
      }
    : {
        background: `linear-gradient(135deg, ${bg} 0%, ${bg} 60%, ${bg}dd 100%)`,
        color: fontColor,
      };

  const announcements = (t.day_of_announcements_list || []).filter(Boolean);

  const tiles: Array<{ show: boolean; label: string; icon: any }> = [
    { show: t.day_of_show_scores_card, label: "Enter Scores", icon: PenLine },
    { show: t.day_of_show_leaderboard_card, label: "Live Leaderboard", icon: BarChart3 },
    { show: t.day_of_show_coursemap_card, label: "Course Map", icon: MapPin },
  ];

  return (
    <div className="bg-white text-foreground overflow-y-auto" style={{ height: "calc(100vh - 220px)", minHeight: 600 }}>
      {/* Header */}
      <div className="p-4 shadow" style={headerStyle}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: fontColor }}>{t.title || "Your Tournament Name"}</h1>
            <p className="text-xs opacity-90 truncate" style={{ color: fontColor }}>
              {t.course_name || "Your Golf Course"}
              {t.date && ` · ${new Date(t.date).toLocaleDateString()}`}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
            style={{ backgroundColor: accent, color: "#1a1a1a" }}
          >
            <Eye className="w-3 h-3" /> Preview
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 -mt-1">
        {/* Welcome */}
        {t.day_of_show_welcome && (
          <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-2" style={{ background: `linear-gradient(90deg, ${bg}22, transparent)` }}>
              <h2 className="text-base font-bold">{welcomeTitle}</h2>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs whitespace-pre-wrap leading-relaxed">{welcomeMsg}</p>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Tee Time" value={SAMPLE.tee_time} icon={<Clock className="w-3 h-3" />} accent={accent} />
                <Stat label="Hole" value={`#${SAMPLE.hole}`} icon={<MapPin className="w-3 h-3" />} accent={accent} />
                <Stat label="Group" value={SAMPLE.group} icon={<Users className="w-3 h-3" />} accent={accent} />
                <Stat label="Position" value={SAMPLE.position} icon={<Users className="w-3 h-3" />} accent={accent} />
              </div>
              <div className="border rounded p-2" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}11` }}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Your Scoring Code</p>
                <p className="text-base font-mono font-bold" style={{ color: bg }}>{SAMPLE.code}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick action tiles */}
        <div className="grid grid-cols-2 gap-2">
          {tiles.filter(x => x.show).map((tile) => (
            <div key={tile.label} className="bg-card border rounded-lg p-3 flex items-center gap-2">
              <div className="rounded p-1.5" style={{ backgroundColor: `${accent}22`, color: bg }}>
                <tile.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium">{tile.label}</span>
            </div>
          ))}
        </div>

        {/* Announcements */}
        {t.day_of_show_announcements_card && (announcements.length > 0 || t.day_of_announcements) && (
          <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4" style={{ color: accent }} />
              <h3 className="text-sm font-bold">Announcements</h3>
            </div>
            <ul className="space-y-1">
              {announcements.map((a, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <span style={{ color: accent }}>•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sponsors placeholder */}
        {t.day_of_show_sponsors && (
          <div className="bg-card border rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {t.day_of_sponsor_title || "Our Generous Sponsors"}
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              {["Sponsor A", "Sponsor B", "Sponsor C"].map((s) => (
                <div key={s} className="px-3 py-2 border rounded text-[10px] text-muted-foreground" style={{ borderColor: `${accent}55` }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: any; icon: React.ReactNode; accent: string }) {
  return (
    <div className="border rounded p-2" style={{ borderColor: `${accent}55` }}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}
