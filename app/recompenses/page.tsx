import {
  Award,
  ChevronRight,
  Coins,
  Gift,
  Leaf,
  LockKeyhole,
  Sparkles,
  Star,
  Ticket,
  Trophy,
} from "lucide-react";
import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import { createClient } from "@/lib/supabase/server";

const rewards = [
  {
    title: "Bon mobilité",
    description: "Réduction partenaire",
    cost: 500,
    icon: Ticket,
  },
  {
    title: "Badge Explorateur",
    description: "Récompense exclusive",
    cost: 750,
    icon: Award,
  },
  {
    title: "Avantage premium",
    description: "Débloqué prochainement",
    cost: 1200,
    icon: Gift,
  },
];

export default async function RecompensesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("flows, co2_saved")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Erreur chargement récompenses :", error);
  }

  const flows = profile?.flows ?? 0;
  const co2Saved = profile?.co2_saved ?? 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        {/* Header */}
        <header>
          <p className="uf-body text-muted">
            Vos efforts sont récompensés
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Flow Rewards
          </h1>
        </header>

        {/* Solde */}
        <section className="relative mt-6 overflow-hidden rounded-[28px] bg-secondary p-6 text-white shadow-[var(--shadow-md)]">

          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-primary/20" />

          <div className="relative">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-white/70">
                  Votre solde
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <Coins size={24} />

                  <p className="text-3xl font-bold">
                    {flows}
                  </p>

                  <span className="text-sm font-semibold text-white/80">
                    FLOWS
                  </span>
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Sparkles size={22} />
              </div>

            </div>

            <div className="mt-6">
              <p className="text-xs text-white/65">
                Effectuez des trajets responsables pour gagner vos premiers FLOWS.
              </p>
            </div>

          </div>
        </section>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-2 gap-3">

          <div className="uf-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Leaf size={18} />
            </div>

            <p className="mt-4 text-xl font-bold text-secondary">
              {Number(co2Saved).toFixed(1)} kg
            </p>

            <p className="uf-caption mt-1 text-muted">
              CO₂ économisé
            </p>
          </div>

          <div className="uf-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Trophy size={18} />
            </div>

            <p className="mt-4 text-xl font-bold text-secondary">
              0
            </p>

            <p className="uf-caption mt-1 text-muted">
              Défis complétés
            </p>
          </div>

        </section>

        {/* Défis */}
        <section className="mt-8">

          <div className="flex items-center justify-between">
            <h2 className="uf-h3 text-secondary">
              Défis
            </h2>

            <span className="uf-caption font-semibold text-primary">
              À venir
            </span>
          </div>

          <div className="uf-card mt-4 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Star size={20} />
            </div>

            <p className="uf-label mt-4 text-secondary">
              Aucun défi actif
            </p>

            <p className="uf-caption mt-2 text-muted">
              Les défis UrbanFlow seront bientôt disponibles.
            </p>
          </div>

        </section>

        {/* Catalogue */}
        <section className="mt-8">

          <div className="flex items-center justify-between">
            <h2 className="uf-h3 text-secondary">
              Récompenses
            </h2>

            <span className="uf-caption text-muted">
              Catalogue
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {rewards.map(
              ({
                title,
                description,
                cost,
                icon: Icon,
              }) => {
                const available = flows >= cost;

                return (
                  <article
                    key={title}
                    className={`uf-card flex items-center gap-3 p-4 ${
                      !available ? "opacity-60" : ""
                    }`}
                  >

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        available
                          ? "bg-primary-soft text-primary"
                          : "bg-background text-subtle"
                      }`}
                    >
                      {available ? (
                        <Icon size={19} />
                      ) : (
                        <LockKeyhole size={18} />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="uf-label text-secondary">
                        {title}
                      </p>

                      <p className="uf-caption mt-1 text-muted">
                        {description}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="uf-label text-secondary">
                        {cost}
                      </p>

                      <p className="uf-caption text-muted">
                        FLOWS
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-subtle"
                    />

                  </article>
                );
              }
            )}
          </div>

        </section>

      </div>

      <BottomNavigation />
    </main>
  );
}