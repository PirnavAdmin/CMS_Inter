import React from "react";
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonText } from "@/components/common/Ui.jsx";
import "../styles/TransportManagerHome.css";

function DashboardCardSkeleton({ variant = "chart" }) {
  return (
    <article className="dashboard-card" aria-hidden="true">
      <div className="dashboard-card-head">
        <Skeleton style={{ width: "52%", height: 18 }} />
      </div>
      <div className="dashboard-card-body">
        {variant === "chart" ? (
          <Skeleton className="dashboard-skeleton-chart" />
        ) : null}
        {variant === "attendance" ? (
          <>
            <Skeleton className="dashboard-skeleton-donut" />
            <div className="dashboard-skeleton-chips">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} />
              ))}
            </div>
          </>
        ) : null}
        {variant === "list" ? (
          <div className="dashboard-skeleton-list">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index}>
                <Skeleton className="dashboard-skeleton-list-icon" />
                <SkeletonText lines={2} widths={["72%", "48%"]} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function TransportManagerDashboardSkeleton() {
  return (
    <main
      className="dashboard-page dashboard-page-skeleton tm-dashboard-skeleton"
      aria-label="Loading transport manager dashboard"
      aria-busy="true"
    >
      {/* 1. Header Bar: Greeting wrap on left, Button on right */}
      <div className="dashboard-header-bar">
        <div className="dashboard-greeting-wrap">
          <Skeleton style={{ width: 280, height: 28 }} />
          <Skeleton style={{ width: 220, height: 14, marginTop: 10 }} />
        </div>
        <SkeletonButton width={156} />
      </div>

      {/* 2. Viewing banner / sub bar matching Screenshot 2 */}
      <div className="dashboard-viewing-banner">
        <Skeleton style={{ width: "78%", height: 14 }} />
      </div>

      {/* 3. 5 KPI Cards in a row with icon circle and 3 text lines */}
      <section className="dashboard-kpi-grid" aria-label="Loading statistics">
        {Array.from({ length: 5 }, (_, index) => (
          <article className="dashboard-kpi-card" key={index}>
            <SkeletonAvatar size={42} />
            <div>
              <Skeleton style={{ width: 92, height: 13 }} />
              <Skeleton style={{ width: 64, height: 26, marginTop: 9 }} />
              <Skeleton style={{ width: 78, height: 10, marginTop: 8 }} />
            </div>
          </article>
        ))}
      </section>

      {/* 4. Quick Actions bar with label and 6 pill buttons */}
      <nav className="dashboard-quick-actions" aria-label="Loading quick actions">
        <Skeleton style={{ width: 108, height: 18 }} />
        <div className="dashboard-quick-actions-list">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonButton key={index} width={124} />
          ))}
        </div>
      </nav>

      {/* 5. Row 1 of 3 cards: chart, chart, attendance donut */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Loading analytics">
        <DashboardCardSkeleton variant="chart" />
        <DashboardCardSkeleton variant="chart" />
        <DashboardCardSkeleton variant="attendance" />
      </section>

      {/* 6. Row 2 of 3 cards: attendance donut, list, list */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Loading operations">
        <DashboardCardSkeleton variant="attendance" />
        <DashboardCardSkeleton variant="list" />
        <DashboardCardSkeleton variant="list" />
      </section>
    </main>
  );
}

export default function TransportManagerSkeleton({ rows = 3, height = "1.5rem" }) {
  return (
    <div className="tm-skeleton-group">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="tm-skeleton"
          style={{
            height,
            marginBottom: i === rows - 1 ? 0 : "0.75rem",
            width: i === 0 ? "100%" : i === rows - 1 ? "70%" : "85%",
          }}
        />
      ))}
    </div>
  );
}
