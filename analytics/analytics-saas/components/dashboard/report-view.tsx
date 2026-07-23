import type { BriefData, Competitor, CompetitorData, ReportOutput } from "@/lib/types/brief";

interface ReportViewProps {
  businessName: string;
  period: string;
  createdAtLabel: string;
  reportData: ReportOutput | null;
  rawData: BriefData | null;
}

const fmt = (n: number) => n.toLocaleString();

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
        {children}
      </span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

function Delta({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const up = value > 0;
  return (
    <span className={up ? "text-success" : "text-danger"}>
      {up ? "▲" : "▼"} {Math.abs(value)}% vs prior
    </span>
  );
}

// Single-value progress bar; width is the share relative to the row's peak.
function Bar({
  label,
  sub,
  value,
  max,
}: {
  label: string;
  sub?: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline text-sm mb-1.5">
        <span className="font-medium text-foreground">
          {label}
          {sub && <span className="text-muted-foreground font-normal"> · {sub}</span>}
        </span>
        <span className="font-mono text-muted-foreground">{fmt(value)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
        <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// Rating ring, value out of 5. Pure SVG so it renders server-side and prints.
function RatingRing({ rating }: { rating: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.max(0, Math.min(1, rating / 5));
  const dash = fraction * circumference;
  return (
    <svg
      viewBox="0 0 120 120"
      width="120"
      height="120"
      role="img"
      aria-label={`${rating} out of 5`}
    >
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="14" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="var(--color-foreground)"
      >
        {rating.toFixed(1)}
      </text>
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontSize="9"
        letterSpacing="2"
        fill="var(--color-muted-foreground)"
      >
        OUT OF 5
      </text>
    </svg>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "20260524" -> "24 May". Manual parse keeps it deterministic (no locale drift).
function formatYmd(ymd: string): string {
  if (ymd.length !== 8) return ymd;
  const mo = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  return `${d} ${MONTHS[mo] ?? ""}`;
}

// seconds -> "M:SS"
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Hand-rolled SVG line chart of daily sessions. Server-rendered and print-safe.
function DailyVisitsChart({ data }: { data: { date: string; sessions: number }[] }) {
  if (data.length < 2) return null;
  const W = 760;
  const H = 200;
  const padL = 36;
  const padR = 14;
  const padT = 18;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.sessions), 1);
  const stepX = innerW / (data.length - 1);
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const linePts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.sessions).toFixed(1)}`).join(" ");
  const areaPts = `${padL},${padT + innerH} ${linePts} ${(padL + innerW).toFixed(1)},${padT + innerH}`;

  const peakIdx = data.reduce((best, d, i) => (d.sessions > data[best].sessions ? i : best), 0);
  const peak = data[peakIdx];
  const gridYs = [padT, padT + innerH / 2, padT + innerH];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily visits" className="w-full h-auto">
      {gridYs.map((gy, i) => (
        <line
          key={i}
          x1={padL}
          y1={gy}
          x2={padL + innerW}
          y2={gy}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      ))}
      <text
        x={padL - 6}
        y={padT + 4}
        textAnchor="end"
        fontSize={9}
        fill="var(--color-muted-foreground)"
      >
        {max}
      </text>
      <text
        x={padL - 6}
        y={padT + innerH}
        textAnchor="end"
        fontSize={9}
        fill="var(--color-muted-foreground)"
      >
        0
      </text>
      <polygon points={areaPts} fill="var(--color-brand)" opacity={0.1} />
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(peakIdx)} cy={y(peak.sessions)} r={4} fill="var(--color-brand-dark)" />
      <text
        x={x(peakIdx)}
        y={y(peak.sessions) - 9}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={500}
        fill="var(--color-brand-dark)"
      >
        {formatYmd(peak.date)} · {peak.sessions}
      </text>
      <text x={padL} y={H - 8} textAnchor="start" fontSize={9} fill="var(--color-muted-foreground)">
        {formatYmd(data[0].date)}
      </text>
      <text
        x={padL + innerW}
        y={H - 8}
        textAnchor="end"
        fontSize={9}
        fill="var(--color-muted-foreground)"
      >
        {formatYmd(data[data.length - 1].date)}
      </text>
    </svg>
  );
}

// Donut highlighting the dominant device, with a full legend.
function DeviceDonut({ devices }: { devices: { device: string; sessions: number }[] }) {
  const total = devices.reduce((s, d) => s + d.sessions, 0);
  if (total === 0) return null;
  const top = devices[0];
  const topPct = Math.round((top.sessions / total) * 100);
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const dash = (top.sessions / total) * circumference;
  const dotColors = ["var(--color-brand)", "var(--color-brand-light)", "var(--color-muted)"];

  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox="0 0 120 120"
        width="104"
        height="104"
        role="img"
        aria-label={`${topPct}% ${top.device}`}
      >
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="15" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="15"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="57"
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="var(--color-foreground)"
        >
          {topPct}%
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fontSize="8"
          letterSpacing="1.5"
          fill="var(--color-muted-foreground)"
        >
          {top.device.toUpperCase()}
        </text>
      </svg>
      <ul className="text-sm space-y-2">
        {devices.map((d, i) => (
          <li key={d.device} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: dotColors[i] ?? "var(--color-muted)" }}
            />
            <span className="text-foreground">
              <span className="font-semibold">{fmt(d.sessions)}</span> {d.device}{" "}
              <span className="text-muted-foreground">({pct(d.sessions, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Coarse Google price level (1–4) as $ pills; renders a muted em dash when unknown.
function PricePills({ level }: { level: number | null }) {
  if (!level || level < 1 || level > 4) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="font-mono" role="img" aria-label={`price level ${level} of 4`}>
      <span className="text-foreground font-semibold">{"$".repeat(level)}</span>
      <span className="text-muted-foreground/50">{"$".repeat(4 - level)}</span>
    </span>
  );
}

function ServiceList({
  services,
  currency,
}: {
  services: { name: string; raw: string }[];
  currency: string;
}) {
  if (services.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {services.map((s) => (
        <li key={`${s.name}-${s.raw}`} className="flex justify-between gap-4">
          <span className="text-foreground">{s.name}</span>
          <span className="font-mono text-muted-foreground whitespace-nowrap">{s.raw}</span>
        </li>
      ))}
      <li className="pt-1 text-xs text-muted-foreground/70">
        Approx, from their website ({currency})
      </li>
    </ul>
  );
}

function CompetitorRow({ competitor, currency }: { competitor: Competitor; currency: string }) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 text-sm">
        <div className="min-w-0">
          {competitor.websiteUri ? (
            <a
              href={competitor.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-brand truncate block"
            >
              {competitor.name}
            </a>
          ) : (
            <span className="font-medium text-foreground truncate block">{competitor.name}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {competitor.distanceKm != null ? `${competitor.distanceKm} km away` : "nearby"}
          </span>
        </div>
        <div className="text-right whitespace-nowrap">
          {competitor.rating > 0 ? (
            <>
              <span className="font-semibold text-foreground">{competitor.rating.toFixed(1)}</span>
              <span className="text-muted-foreground"> ({fmt(competitor.totalReviews)})</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="text-right">
          <PricePills level={competitor.priceLevel} />
        </div>
      </div>
      <ServiceList services={competitor.services} currency={currency} />
    </div>
  );
}

function CompetitorLandscape({
  data,
  businessName,
}: {
  data: CompetitorData;
  businessName: string;
}) {
  return (
    <section className="px-8 py-7 border-b border-border">
      <SectionLabel>Competitor landscape</SectionLabel>
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 pb-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
        <span>Business</span>
        <span className="text-right">Rating</span>
        <span className="text-right">Price</span>
      </div>
      {/* Owner row, highlighted for comparison. */}
      <div className="py-3 border-b border-border bg-muted/30 -mx-2 px-2 rounded">
        <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 text-sm">
          <span className="font-semibold text-brand truncate">{businessName} (you)</span>
          <span />
          <span />
        </div>
        {data.ownServices.length > 0 ? (
          <ServiceList services={data.ownServices} currency={data.currency} />
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Your prices aren’t published on your site — customers can’t compare at a glance.
          </p>
        )}
      </div>
      {data.competitors.map((c) => (
        <CompetitorRow key={c.placeId} competitor={c} currency={data.currency} />
      ))}
      <p className="mt-4 text-xs text-muted-foreground/70">
        Nearby businesses from Google Maps. Prices are approximate, pulled from each business’s
        public website, and may be incomplete — verify before acting.
      </p>
    </section>
  );
}

function NotConnected({ source, reason }: { source: string; reason: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{source} not connected.</span> {reason}
    </div>
  );
}

export function ReportView({
  businessName,
  period,
  createdAtLabel,
  reportData,
  rawData,
}: ReportViewProps) {
  const ga4 = rawData?.connections.ga4 ?? false;
  const gbp = rawData?.connections.gbp ?? false;

  const website = rawData?.website;
  const search = rawData?.search;
  const local = rawData?.local;
  const reputation = rawData?.reputation;

  const trafficMax = website?.trafficSources?.length
    ? Math.max(...website.trafficSources.map((s) => s.sessions))
    : 0;
  const pagesMax = website?.topPages?.length
    ? Math.max(...website.topPages.map((p) => p.views))
    : 0;

  // Lead the takeaway with the AI summary's first paragraph; the full brief lives below.
  const takeaway = reportData?.summary?.split(/\n\n+/)[0] ?? "";

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Masthead */}
      <header className="px-8 py-8 border-b border-border">
        <div className="text-xs font-semibold uppercase tracking-[0.32em] text-brand mb-3">
          Monthly Website Brief
        </div>
        <h1 className="text-4xl font-bold text-foreground leading-tight">{businessName}</h1>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="text-foreground font-medium">Period</span> &nbsp;{period}
          </span>
          <span>
            <span className="text-foreground font-medium">Generated</span> &nbsp;{createdAtLabel}
          </span>
        </div>
      </header>

      {/* TEMP DEBUG — remove after diagnosing competitor render. Prints the raw
          competitor state so we can see data-vs-render on the page itself. */}
      <div className="px-8 py-2 bg-yellow-100 text-yellow-900 text-xs font-mono border-b border-yellow-300">
        DEBUG competitors: present={String(Boolean(rawData?.competitors))} · count=
        {rawData?.competitors?.competitors?.length ?? "n/a"} · connFlag=
        {String(rawData?.connections?.competitors ?? "n/a")} · rawDataKeys=
        {rawData ? Object.keys(rawData).join(",") : "NO rawData"}
      </div>

      {/* Hero: the bottom line */}
      <section className="px-8 py-8 bg-slate-900 text-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
            The bottom line
          </span>
          <span className="flex-1 h-px bg-white/15" />
        </div>
        {!ga4 || !website ? (
          <p className="text-slate-300 text-sm">
            Connect Google Analytics to see how visitors move through your site.
          </p>
        ) : local && local.totalInteractions > 0 ? (
          // Booking-led hero: only when the GA4 property is linked to a Business
          // Profile and actually reports customer interactions.
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-6xl font-bold text-white leading-none">
                {fmt(local.bookings)}
                <span className="text-2xl text-brand-light font-medium"> booking clicks</span>
              </div>
              <p className="mt-4 text-slate-300 max-w-sm leading-relaxed">
                {pct(local.bookings, website.sessions)}% of the{" "}
                <span className="text-white font-medium">{fmt(website.sessions)}</span> visitors
                took a real step toward an appointment this period.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {[
                { lab: "Visited the site", v: fmt(website.sessions) },
                { lab: "Clicked “Book”", v: fmt(local.bookings) },
                { lab: "Clicked to call", v: fmt(local.calls) },
                { lab: "Got directions", v: fmt(local.directions) },
              ].map((row) => (
                <div key={row.lab} className="flex justify-between items-baseline py-3">
                  <span className="text-slate-300 text-sm">{row.lab}</span>
                  <span className="text-2xl font-semibold text-white">{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Visitor-led hero: GA4 is connected but there are no Business Profile
          // interactions to report, so lead with the traffic story instead of a
          // row of zeros.
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-6xl font-bold text-white leading-none">
                {fmt(website.sessions)}
                <span className="text-2xl text-brand-light font-medium"> visitors</span>
              </div>
              <p className="mt-4 text-slate-300 max-w-sm leading-relaxed">
                <span className="text-white font-medium">
                  {(website.engagementRate * 100).toFixed(0)}%
                </span>{" "}
                actively engaged with the site this period
                {website.sessionsDelta
                  ? `, with visits ${website.sessionsDelta > 0 ? "up" : "down"} ${Math.abs(
                      website.sessionsDelta,
                    )}% on the month before.`
                  : "."}
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {[
                { lab: "Visits", v: fmt(website.sessions) },
                { lab: "Engaged", v: `${(website.engagementRate * 100).toFixed(0)}%` },
                { lab: "Search clicks", v: search ? fmt(search.clicks) : "—" },
                ...(gbp && reputation
                  ? [{ lab: "Avg rating", v: reputation.averageRating.toFixed(1) }]
                  : []),
              ].map((row) => (
                <div key={row.lab} className="flex justify-between items-baseline py-3">
                  <span className="text-slate-300 text-sm">{row.lab}</span>
                  <span className="text-2xl font-semibold text-white">{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* KPI strip */}
      <section className="px-8 py-7 border-b border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="md:border-r border-border md:pr-6">
            <div className="text-3xl font-bold text-foreground">
              {ga4 && website ? fmt(website.sessions) : "—"}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Visitors
            </div>
            <div className="mt-1 text-xs">
              {ga4 && website ? <Delta value={website.sessionsDelta} /> : "GA4 not linked"}
            </div>
          </div>
          <div className="md:border-r border-border md:pr-6">
            <div className="text-3xl font-bold text-foreground">
              {ga4 && website ? `${(website.engagementRate * 100).toFixed(0)}%` : "—"}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Engagement
            </div>
            <div className="mt-1 text-xs text-muted-foreground">visitors who interacted</div>
          </div>
          <div className="md:border-r border-border md:pr-6">
            <div className="text-3xl font-bold text-foreground">
              {search ? fmt(search.clicks) : "—"}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Search clicks
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {search ? `${fmt(search.impressions)} impressions` : "—"}
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">
              {gbp && reputation ? reputation.averageRating.toFixed(1) : "—"}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Avg rating
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {gbp && reputation ? `${fmt(reputation.totalReviews)} reviews` : "GBP not linked"}
            </div>
          </div>
        </div>
      </section>

      {/* Traffic sources + reputation */}
      <section className="px-8 py-7 border-b border-border grid md:grid-cols-2 gap-10">
        <div>
          <SectionLabel>How people found you</SectionLabel>
          {ga4 && website?.trafficSources?.length ? (
            website.trafficSources.map((s) => (
              <Bar key={s.source} label={s.source} value={s.sessions} max={trafficMax} />
            ))
          ) : (
            <NotConnected source="Google Analytics" reason="Traffic sources are unavailable." />
          )}
        </div>
        <div>
          <SectionLabel>Reputation</SectionLabel>
          {gbp && reputation ? (
            <div className="flex items-center gap-6">
              <RatingRing rating={reputation.averageRating} />
              <div className="text-sm">
                <p className="text-foreground">
                  <span className="font-semibold">{fmt(reputation.totalReviews)}</span> total
                  reviews
                </p>
                <p className="mt-1 text-foreground">
                  <span className="font-semibold">{fmt(reputation.newReviewsThisMonth)}</span> new
                  this period
                </p>
                {reputation.newReviews[0] && (
                  <p className="mt-3 text-muted-foreground italic line-clamp-3">
                    “{reputation.newReviews[0].text}”
                  </p>
                )}
              </div>
            </div>
          ) : (
            <NotConnected
              source="Business Profile"
              reason="Review and rating data is unavailable."
            />
          )}
        </div>
      </section>

      {/* Visits over time + devices */}
      {ga4 && website?.dailySessions && website.dailySessions.length > 1 && (
        <section className="px-8 py-7 border-b border-border">
          <SectionLabel>Visits over time</SectionLabel>
          <DailyVisitsChart data={website.dailySessions} />
          <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
            {website.devices && website.devices.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Device
                </p>
                <DeviceDonut devices={website.devices} />
              </div>
            )}
            {website.avgSessionDuration ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Avg time on site
                </p>
                <div className="text-4xl font-bold text-foreground">
                  {formatDuration(website.avgSessionDuration)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">minutes per visit</p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Search visibility */}
      {search && (
        <section className="px-8 py-7 border-b border-border">
          <SectionLabel>Search visibility</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-2xl font-bold text-foreground">{fmt(search.impressions)}</div>
              <div className="text-xs text-muted-foreground mt-1">Impressions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{fmt(search.clicks)}</div>
              <div className="text-xs text-muted-foreground mt-1">Clicks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {(search.ctr * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Click-through</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{search.avgPosition}</div>
              <div className="text-xs text-muted-foreground mt-1">Avg position</div>
            </div>
          </div>
          {search.topQueries.length > 0 && (
            <div className="grid md:grid-cols-2 gap-x-10">
              {search.topQueries.slice(0, 6).map((q) => (
                <div
                  key={q.query}
                  className="flex justify-between items-baseline py-2 border-b border-border text-sm"
                >
                  <span className="text-foreground truncate pr-4">{q.query}</span>
                  <span className="font-mono text-muted-foreground whitespace-nowrap">
                    {fmt(q.clicks)} {q.clicks === 1 ? "click" : "clicks"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Top pages */}
      {ga4 && website?.topPages && website.topPages.length > 0 && (
        <section className="px-8 py-7 border-b border-border">
          <SectionLabel>Most-viewed pages</SectionLabel>
          {website.topPages.map((p) => (
            <Bar key={p.path} label={p.path} value={p.views} max={pagesMax} />
          ))}
        </section>
      )}

      {/* Competitor landscape */}
      {rawData?.competitors && rawData.competitors.competitors.length > 0 && (
        <CompetitorLandscape data={rawData.competitors} businessName={businessName} />
      )}

      {/* Takeaway */}
      {takeaway && (
        <div className="px-8 py-7 bg-muted/30 border-b border-border">
          <p className="text-lg italic leading-relaxed text-foreground">{takeaway}</p>
        </div>
      )}

      {/* Where to focus */}
      {reportData?.actions && reportData.actions.length > 0 && (
        <section className="px-8 py-7">
          <SectionLabel>Where to focus next</SectionLabel>
          <div className="divide-y divide-border">
            {reportData.actions.map((action, i) => (
              <div key={i} className="flex gap-5 py-4 first:pt-0 last:pb-0">
                <span className="text-2xl font-bold italic text-brand leading-none w-8 shrink-0">
                  {i + 1}
                </span>
                <p className="text-foreground leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
