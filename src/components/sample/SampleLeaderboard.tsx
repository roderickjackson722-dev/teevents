import {
  LeaderboardRenderer,
  mergeDesign,
  type LbRow,
} from "@/components/leaderboard/LeaderboardCore";

interface SampleLeaderboardRow {
  id?: string;
  player_name?: string | null;
  gross_score?: number | null;
  net_score?: number | null;
  thru?: number | null;
}

interface Props {
  eventName: string;
  rows: SampleLeaderboardRow[];
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  compact?: boolean;
}

function readableText(background: string) {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#FFFFFF";
  const [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map(
    (part) => parseInt(part, 16),
  );
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#FFFFFF";
}

export default function SampleLeaderboard({
  eventName,
  rows,
  logoUrl,
  primaryColor,
  secondaryColor,
  compact = false,
}: Props) {
  const leaderboardRows: LbRow[] = rows.map((row, index) => ({
    key: row.id || `${row.player_name}-${index}`,
    name: row.player_name || `Player ${index + 1}`,
    total: Number(row.gross_score || 0),
    thru: Number(row.thru || 18),
    parPlayed:
      Number(row.thru || 18) >= 18
        ? 72
        : Math.max(4, Number(row.thru || 1) * 4),
    subtitle: row.net_score != null ? `Net ${row.net_score}` : undefined,
  }));
  const textColor = readableText(primaryColor);
  const design = mergeDesign({
    title: eventName,
    background_color: primaryColor,
    header_background: primaryColor,
    text_color: textColor,
    accent_color: secondaryColor,
    show_sponsor_banner: false,
    max_rows: compact ? 6 : 20,
    row_paging_mode: "pages",
  });

  return (
    <LeaderboardRenderer
      compact={compact}
      design={design}
      title={eventName}
      rows={leaderboardRows}
      logoUrl={logoUrl}
      subtitle="Live Leaderboard"
    />
  );
}
