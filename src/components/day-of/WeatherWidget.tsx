import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, Wind } from "lucide-react";

interface Props {
  location?: string | null;
}

interface WeatherData {
  temp: number;
  description: string;
  code: number;
  windMph: number;
}

// Open-Meteo WMO weather codes -> label + icon
function describe(code: number): { label: string; Icon: typeof Sun } {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if ([1, 2].includes(code)) return { label: "Partly Cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Cloudy", Icon: Cloud };
  if ([45, 48].includes(code)) return { label: "Foggy", Icon: Cloud };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return { label: "Rain", Icon: CloudRain };
  if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", Icon: CloudRain };
  return { label: "—", Icon: Cloud };
}

export default function WeatherWidget({ location }: Props) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!location || !location.trim()) { setErr(true); return; }
    (async () => {
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`).then((r) => r.json());
        const place = geo?.results?.[0];
        if (!place) { setErr(true); return; }
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`).then((r) => r.json());
        const c = wx?.current;
        if (!c || cancelled) return;
        setData({ temp: Math.round(c.temperature_2m), description: describe(c.weather_code).label, code: c.weather_code, windMph: Math.round(c.wind_speed_10m) });
      } catch {
        if (!cancelled) setErr(true);
      }
    })();
    return () => { cancelled = true; };
  }, [location]);

  if (err) {
    return (
      <div className="flex items-center gap-2 text-xs bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm opacity-80">
        <Cloud className="w-3.5 h-3.5" />
        <span>Weather data unavailable</span>
      </div>
    );
  }
  if (!data) return null;
  const { Icon } = describe(data.code);
  return (
    <div className="flex items-center gap-2 text-sm bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm">
      <Icon className="w-4 h-4" />
      <span>{data.description} · {data.temp}°F</span>
      <span className="opacity-80 flex items-center gap-1"><Wind className="w-3 h-3" /> {data.windMph} mph</span>
    </div>
  );
}
