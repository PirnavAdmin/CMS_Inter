import "./Skeleton.css";

/** Shared, layout-safe loading primitives.  Keep data fetching state outside these components. */
export function Skeleton({ className = "", style, ariaLabel = "Loading content" }) {
  return <span className={`cms-skeleton ${className}`.trim()} style={style} role="status" aria-label={ariaLabel}><span className="cms-sr-only">{ariaLabel}</span></span>;
}

export function SkeletonText({ lines = 2, className = "", widths = ["92%", "68%"] }) {
  return <div className={`cms-skeleton-text ${className}`.trim()}>{Array.from({ length: lines }, (_, i) => <Skeleton key={i} style={{ width: widths[i % widths.length] }} />)}</div>;
}

export function SkeletonAvatar({ size = 40, className = "" }) { return <Skeleton className={`cms-skeleton-avatar ${className}`} style={{ width: size, height: size }} />; }
export function SkeletonButton({ width = 110, className = "" }) { return <Skeleton className={`cms-skeleton-button ${className}`} style={{ width }} />; }
export function SkeletonInput({ label = true, className = "" }) { return <div className={`cms-skeleton-input ${className}`}>{label && <Skeleton className="cms-skeleton-label" />}<Skeleton className="cms-skeleton-control" /></div>; }

export function SkeletonRow({ columns = 4 }) {
  return <tr className="cms-skeleton-table-row">{Array.from({ length: columns }, (_, i) => <td key={i}><Skeleton style={{ width: `${i === 0 ? 72 : 50 + ((i * 13) % 34)}%` }} /></td>)}</tr>;
}

export function SkeletonTable({ columns = 4, rows = 5, className = "" }) {
  return <div className={`cms-skeleton-table-wrap ${className}`.trim()} role="status" aria-label="Loading table"><table className="cms-table cms-skeleton-table"><tbody>{Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} columns={columns} />)}</tbody></table></div>;
}

export function SkeletonCard({ className = "", lines = 2 }) { return <article className={`cms-skeleton-card ${className}`.trim()}><Skeleton className="cms-skeleton-card-title" /><SkeletonText lines={lines} /></article>; }

export function SkeletonDashboard({ cards = 4, tableColumns = 5 }) { return <div className="cms-skeleton-dashboard"><div className="cms-skeleton-stats">{Array.from({ length: cards }, (_, i) => <SkeletonCard key={i} lines={1} />)}</div><div className="cms-skeleton-dashboard-grid"><SkeletonCard className="cms-skeleton-chart" lines={3} /><SkeletonTable columns={tableColumns} /></div></div>; }

export function SkeletonPage({ variant = "page", columns = 4, rows = 5, className = "" }) {
  if (variant === "table") return <SkeletonTable columns={columns} rows={rows} className={className} />;
  if (variant === "dashboard") return <SkeletonDashboard cards={columns} tableColumns={columns} />;
  if (variant === "form") return <div className={`cms-skeleton-form ${className}`}>{Array.from({ length: rows }, (_, i) => <SkeletonInput key={i} />)}<SkeletonButton /></div>;
  return <div className={`cms-skeleton-page ${className}`.trim()}><Skeleton className="cms-skeleton-page-title" /><SkeletonText lines={1} widths={["42%"]} /><div className="cms-skeleton-page-content"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></div></div>;
}
