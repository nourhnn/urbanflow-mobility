import BottomNavigation from "@/components/layout/BottomNavigation";
import JourneyHistory from "@/components/journey/JourneyHistory";
import JourneyPlanner from "@/components/journey/JourneyPlanner";

export default function TrajetsPage() {
  return (
    <main className="min-h-screen bg-background pb-28">

      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        <header>
          <p className="uf-body text-muted">
            Planifiez votre déplacement
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Trouver un trajet
          </h1>
        </header>

        <JourneyPlanner />

        <JourneyHistory />

      </div>

      <BottomNavigation />

    </main>
  );
}