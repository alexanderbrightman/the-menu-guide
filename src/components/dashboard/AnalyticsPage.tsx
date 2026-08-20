'use client'

import { useState, type CSSProperties } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary'
import { UpgradeCard } from '@/components/payment/UpgradeCard'
import { getThemedGlassCardStyle } from '@/lib/glass-styles'
import { menuShareUrl } from '@/lib/site-url'
import type {
  AnalyticsSourceRow,
  AnalyticsTopItem,
  PeriodMetrics,
  TrendPoint,
} from '@/lib/analytics-types'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatRate(rate: number | null): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function formatChange(metrics: PeriodMetrics): string {
  if (metrics.isNew) return 'New'
  if (metrics.changePct == null) return '—'
  const rounded = Math.round(metrics.changePct)
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}%`
}

function formatDayLabel(isoDate: string, compact: boolean): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    weekday: compact ? 'narrow' : 'short',
    timeZone: 'UTC',
  })
}

export function AnalyticsPage() {
  const { profile } = useAuth()
  const theme = useMenuTheme(profile)
  const access = usePremiumFeature('analytics dashboard')
  const { data, loading, error } = useAnalyticsSummary(access.canAccess)
  const [range, setRange] = useState<7 | 30>(7)

  const cardStyle = getThemedGlassCardStyle(theme.isDarkBackground)
  const hairline = theme.isDarkBackground ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'
  const muted = theme.isDarkBackground ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'

  const period = range === 7 ? data?.week : data?.month
  const trend = range === 7 ? data?.trend7 : data?.trend30
  const topItems = range === 7 ? data?.topItems7 : data?.topItems30
  const sources = range === 7 ? data?.sources7 : data?.sources30

  const publicMenuUrl = profile?.username
    ? menuShareUrl(profile.username)
    : ''

  if (!access.canAccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <Header contrastColor={theme.contrastColor} muted={muted} />
        <p className="text-[15px] leading-relaxed" style={{ color: theme.contrastColor, fontFamily: APPLE_FONT }}>
          See how many people open your public menu, which dishes they tap, and whether
          interest is growing week over week — no diner accounts required.
        </p>
        <UpgradeCard />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <Header contrastColor={theme.contrastColor} muted={muted} />
        <RangeToggle
          range={range}
          onChange={setRange}
          contrastColor={theme.contrastColor}
          isDark={theme.isDarkBackground}
          hairline={hairline}
        />
      </div>

      {loading && <LoadingState cardStyle={cardStyle} />}

      {!loading && error && (
        <div
          className="rounded-2xl px-4 py-3 text-[14px]"
          style={{ ...cardStyle, color: theme.contrastColor, fontFamily: APPLE_FONT }}
        >
          {error}
        </div>
      )}

      {!loading && !error && data && period && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <KpiCard
              label="Views"
              value={formatCount(period.profileViews)}
              change={formatChange(period)}
              direction={period.changePct}
              isNew={period.isNew}
              cardStyle={cardStyle}
              contrastColor={theme.contrastColor}
              muted={muted}
            />
            <KpiCard
              label="Interactions"
              value={formatCount(period.interactions)}
              change={formatChange({
                ...period,
                changePct: period.interactionsChangePct,
                isNew: period.interactionsIsNew,
              })}
              direction={period.interactionsChangePct}
              isNew={period.interactionsIsNew}
              hint={`${formatCount(period.itemClicks)} taps · ${formatCount(period.shares)} shares`}
              cardStyle={cardStyle}
              contrastColor={theme.contrastColor}
              muted={muted}
            />
            <KpiCard
              label="Engagement"
              value={formatRate(period.engagementRate)}
              hint="Taps + shares ÷ views"
              cardStyle={cardStyle}
              contrastColor={theme.contrastColor}
              muted={muted}
            />
          </div>

          <p className="text-[12px] leading-snug px-0.5" style={{ color: muted, fontFamily: APPLE_FONT }}>
            Higher engagement means visitors are actually looking at your specials, not just opening the page.
          </p>

          {data.platform.multiplier != null && data.platform.engagementRate != null && (
            <p className="text-[13px] leading-snug px-0.5" style={{ color: theme.contrastColor, fontFamily: APPLE_FONT }}>
              Your engagement is <strong>{data.platform.multiplier.toFixed(1)}×</strong> the average restaurant
              on The Menu Guide ({formatRate(data.platform.engagementRate)}).
            </p>
          )}

          <TrendCard
            points={trend || []}
            range={range}
            cardStyle={cardStyle}
            contrastColor={theme.contrastColor}
            muted={muted}
            isDark={theme.isDarkBackground}
          />

          <TopItemsCard
            items={topItems || []}
            cardStyle={cardStyle}
            contrastColor={theme.contrastColor}
            muted={muted}
            hairline={hairline}
          />

          <SourcesCard
            sources={sources || []}
            cardStyle={cardStyle}
            contrastColor={theme.contrastColor}
            muted={muted}
            isDark={theme.isDarkBackground}
          />

          <div
            className="rounded-2xl px-4 py-4"
            style={{ ...cardStyle, color: theme.contrastColor, fontFamily: APPLE_FONT }}
          >
            <p className="text-[12px] uppercase tracking-[0.06em]" style={{ color: muted }}>
              Since you joined
            </p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight">
              {formatCount(data.allTime.profileViews)} views
              <span className="mx-2 opacity-30">·</span>
              {formatCount(data.allTime.interactions)} interactions
            </p>
            {data.allTime.profileViews === 0 && (
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: muted }}>
                Share your menu or put the QR code on the table.{' '}
                {publicMenuUrl && (
                  <a
                    href={publicMenuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: theme.contrastColor }}
                  >
                    Open your public page
                  </a>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Header({ contrastColor, muted }: { contrastColor: string; muted: string }) {
  return (
    <div>
      <h2
        className="text-[22px] font-semibold tracking-tight"
        style={{ color: contrastColor, fontFamily: APPLE_FONT, letterSpacing: '-0.022em' }}
      >
        Analytics
      </h2>
      <p className="mt-0.5 text-[13px]" style={{ color: muted, fontFamily: APPLE_FONT }}>
        How guests find and use your menu
      </p>
    </div>
  )
}

function RangeToggle({
  range,
  onChange,
  contrastColor,
  isDark,
  hairline,
}: {
  range: 7 | 30
  onChange: (value: 7 | 30) => void
  contrastColor: string
  isDark: boolean
  hairline: string
}) {
  const activeBg = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'
  return (
    <div
      className="flex rounded-full p-0.5 flex-shrink-0"
      style={{ border: `0.5px solid ${hairline}`, fontFamily: APPLE_FONT }}
    >
      {([7, 30] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className="px-3 py-1.5 text-[12px] font-medium rounded-full"
          style={{
            color: contrastColor,
            backgroundColor: range === value ? activeBg : 'transparent',
          }}
        >
          {value}d
        </button>
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  change,
  direction,
  isNew,
  hint,
  cardStyle,
  contrastColor,
  muted,
}: {
  label: string
  value: string
  change?: string
  direction?: number | null
  isNew?: boolean
  hint?: string
  cardStyle: CSSProperties
  contrastColor: string
  muted: string
}) {
  const up = (direction ?? 0) > 0
  const down = (direction ?? 0) < 0
  const changeColor = isNew ? muted : up ? '#34C759' : down ? '#FF3B30' : muted

  return (
    <div className="rounded-2xl px-3 py-3.5 sm:px-4" style={{ ...cardStyle, fontFamily: APPLE_FONT }}>
      <p className="text-[11px] uppercase tracking-[0.06em]" style={{ color: muted }}>
        {label}
      </p>
      <p
        className="mt-1 text-[22px] sm:text-[26px] font-semibold tracking-tight tabular-nums"
        style={{ color: contrastColor, letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {change && (
        <p className="mt-1 flex items-center gap-0.5 text-[12px] font-medium" style={{ color: changeColor }}>
          {isNew || direction == null ? (
            <Minus className="h-3 w-3" />
          ) : up ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : down ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {change}
        </p>
      )}
      {hint && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: muted }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function TrendCard({
  points,
  range,
  cardStyle,
  contrastColor,
  muted,
  isDark,
}: {
  points: TrendPoint[]
  range: 7 | 30
  cardStyle: CSSProperties
  contrastColor: string
  muted: string
  isDark: boolean
}) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.views, p.interactions)))
  const viewsFill = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.78)'
  const interactFill = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.28)'

  return (
    <div className="rounded-2xl px-4 py-4" style={{ ...cardStyle, fontFamily: APPLE_FONT }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold" style={{ color: contrastColor }}>
          Last {range} days
        </p>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: muted }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: viewsFill }} />
            Views
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: interactFill }} />
            Interactions
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-end gap-[3px] sm:gap-1 h-28">
        {points.map((point) => (
          <div key={point.date} className="flex-1 h-full flex items-end justify-center gap-px">
            <div
              className="w-[46%] rounded-t-[3px] min-h-[2px]"
              style={{
                height: `${Math.max(4, (point.views / max) * 100)}%`,
                background: viewsFill,
              }}
              title={`${point.date}: ${point.views} views`}
            />
            <div
              className="w-[46%] rounded-t-[3px] min-h-[2px]"
              style={{
                height: `${Math.max(4, (point.interactions / max) * 100)}%`,
                background: interactFill,
              }}
              title={`${point.date}: ${point.interactions} interactions`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] sm:gap-1">
        {points.map((point, index) => {
          const show = range === 7 || index % 5 === 0 || index === points.length - 1
          return (
            <span
              key={point.date}
              className="flex-1 text-center text-[9px] sm:text-[10px] tabular-nums"
              style={{ color: muted, visibility: show ? 'visible' : 'hidden' }}
            >
              {formatDayLabel(point.date, range === 30)}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TopItemsCard({
  items,
  cardStyle,
  contrastColor,
  muted,
  hairline,
}: {
  items: AnalyticsTopItem[]
  cardStyle: CSSProperties
  contrastColor: string
  muted: string
  hairline: string
}) {
  return (
    <div className="rounded-2xl px-4 py-4" style={{ ...cardStyle, fontFamily: APPLE_FONT }}>
      <p className="text-[15px] font-semibold" style={{ color: contrastColor }}>
        Top items
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px]" style={{ color: muted }}>
          When guests tap a dish, it will show up here.
        </p>
      ) : (
        <ol className="mt-3 space-y-0">
          {items.map((item, index) => (
            <li
              key={`${item.entityKind}:${item.id}`}
              className="flex items-center gap-3 py-2.5"
              style={{ borderTop: index === 0 ? undefined : `0.5px solid ${hairline}` }}
            >
              <span className="w-5 text-[13px] tabular-nums" style={{ color: muted }}>
                {index + 1}
              </span>
              <span className="flex-1 min-w-0 text-[14px] font-medium truncate" style={{ color: contrastColor }}>
                {item.title}
              </span>
              <span className="text-[13px] tabular-nums" style={{ color: muted }}>
                {formatCount(item.clicks)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function SourcesCard({
  sources,
  cardStyle,
  contrastColor,
  muted,
  isDark,
}: {
  sources: AnalyticsSourceRow[]
  cardStyle: CSSProperties
  contrastColor: string
  muted: string
  isDark: boolean
}) {
  const max = Math.max(1, ...sources.map((s) => s.views))
  const bar = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
  const track = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <div className="rounded-2xl px-4 py-4" style={{ ...cardStyle, fontFamily: APPLE_FONT }}>
      <p className="text-[15px] font-semibold" style={{ color: contrastColor }}>
        Traffic sources
      </p>
      {sources.length === 0 ? (
        <p className="mt-2 text-[13px]" style={{ color: muted }}>
          Instagram, Google, QR scans, and The Menu Guide will appear as people visit.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sources.map((row) => (
            <li key={row.source}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span style={{ color: contrastColor }}>{row.label}</span>
                <span className="tabular-nums" style={{ color: muted }}>
                  {formatCount(row.views)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(row.views / max) * 100}%`, background: bar }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LoadingState({
  cardStyle,
}: {
  cardStyle: CSSProperties
}) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl h-[92px]" style={cardStyle} />
        ))}
      </div>
      <div className="rounded-2xl h-44" style={cardStyle} />
    </div>
  )
}
