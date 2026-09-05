"use client";

import dynamic from "next/dynamic";

const JourneyPlanner = dynamic(
  () => import("@/components/journey/JourneyPlanner"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 flex items-center justify-center py-10">
        <p className="uf-body text-muted">
          Chargement du planificateur...
        </p>
      </div>
    ),
  }
);

export default function JourneyPlannerClient() {
  return <JourneyPlanner />;
}