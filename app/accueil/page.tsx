import {
  ArrowRight,
  Bike,
  Bus,
  Car,
  Footprints,
  Leaf,
  MapPin,
  Sparkles,
  TrainFront,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import { createClient } from "@/lib/supabase/server";

export default async function AccueilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      first_name,
      flows,
      co2_saved
    `)
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Erreur chargement profil :",
      profileError
    );
  }

  const {
    count: rewardedJourneysCount,
    error: journeysCountError,
  } = await supabase
    .from("journeys")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", user.id)
    .eq("status", "rewarded");

  if (journeysCountError) {
    console.error(
      "Erreur comptage trajets :",
      journeysCountError
    );
  }

  const {
    data: recentJourneys,
    error: recentJourneysError,
  } = await supabase
    .from("journeys")
    .select(`
      id,
      transport_mode,
      destination_name,
      distance_meters,
      flows_earned,
      co2_saved,
      completed_at,
      created_at
    `)
    .eq("user_id", user.id)
    .eq("status", "rewarded")
    .order("completed_at", {
      ascending: false,
    })
    .limit(3);

  if (recentJourneysError) {
    console.error(
      "Erreur chargement trajets récents :",
      recentJourneysError
    );
  }

  const firstName =
    profile?.first_name ??
    user.user_metadata?.first_name ??
    "Utilisateur";

  const flows =
    profile?.flows ?? 0;

  const co2Saved =
    Number(profile?.co2_saved ?? 0);

  const journeyCount =
    rewardedJourneysCount ?? 0;

  const transportModes = [
    {
      label: "Marche",
      icon: Footprints,
    },
    {
      label: "Vélo",
      icon: Bike,
    },
    {
      label: "Voiture",
      icon: Car,
    },
    {
      label: "Transports",
      icon: Bus,
    },
  ];

  function getModeLabel(
    transportMode: string
  ) {
    const mode =
      transportMode.toLowerCase();

    if (mode === "walking") {
      return "Marche";
    }

    if (mode === "cycling") {
      return "Vélo";
    }

    if (mode === "driving") {
      return "Voiture";
    }

    if (mode.includes(",")) {
      return "Multimodal";
    }

    if (mode.includes("metro")) {
      return "Métro";
    }

    if (mode.includes("bus")) {
      return "Bus";
    }

    if (mode.includes("tram")) {
      return "Tram";
    }

    if (
      mode.includes("train") ||
      mode.includes("rer")
    ) {
      return "Train / RER";
    }

    return "Transports";
  }

  function formatDistance(
    meters: number | null
  ) {
    if (!meters) {
      return "—";
    }

    if (meters < 1000) {
      return `${Math.round(
        meters
      )} m`;
    }

    return `${(
      meters / 1000
    ).toFixed(1)} km`;
  }

  return (
    <main className="min-h-screen bg-background pb-28">

      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        {/* Header */}
        <header>

          <p className="uf-body text-muted">
            Bonjour {firstName} 👋
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Où allez-vous aujourd&apos;hui ?
          </h1>

        </header>

        {/* Planifier */}
        <section className="mt-6">

          <Link
            href="/trajets"
            className="block rounded-[24px] bg-primary p-5 text-white shadow-sm transition active:scale-[0.99]"
          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-sm font-medium text-white/75">
                  Nouveau trajet
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Planifier un déplacement
                </h2>

                <p className="mt-2 max-w-[260px] text-sm leading-5 text-white/80">
                  Comparez les modes de transport et choisissez l&apos;option la plus adaptée.
                </p>

              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <MapPin size={21} />
              </div>

            </div>

            <div className="mt-5 flex items-center gap-2 font-semibold">

              Trouver un trajet

              <ArrowRight size={17} />

            </div>

          </Link>

        </section>

        {/* Statistiques */}
        <section className="mt-5 grid grid-cols-3 gap-3">

          <div className="uf-card px-3 py-4 text-center">

            <p className="text-xl font-bold text-secondary">
              {journeyCount}
            </p>

            <p className="uf-caption mt-1 text-muted">
              Trajets
            </p>

          </div>

          <div className="uf-card px-3 py-4 text-center">

            <p className="text-xl font-bold text-primary">
              {co2Saved.toFixed(2)}
            </p>

            <p className="uf-caption mt-1 text-muted">
              kg CO₂
            </p>

          </div>

          <div className="uf-card px-3 py-4 text-center">

            <p className="text-xl font-bold text-secondary">
              {flows}
            </p>

            <p className="uf-caption mt-1 text-muted">
              FLOWS
            </p>

          </div>

        </section>

        {/* Modes */}
        <section className="mt-8">

          <div>

            <h2 className="uf-h3 text-secondary">
              Se déplacer
            </h2>

            <p className="uf-caption mt-1 text-muted">
              Choisissez votre mode préféré
            </p>

          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">

            {transportModes.map(
              ({
                label,
                icon: Icon,
              }) => (
                <Link
                  key={label}
                  href="/trajets"
                  className="uf-card flex flex-col items-center justify-center px-2 py-4 text-center transition active:scale-[0.98]"
                >

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon size={18} />
                  </div>

                  <span className="uf-caption mt-2 font-medium text-secondary">
                    {label}
                  </span>

                </Link>
              )
            )}

          </div>

        </section>

        {/* Impact */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Votre impact
          </h2>

          <div className="uf-card mt-4 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Leaf size={20} />
              </div>

              <div>

                <p className="uf-label text-secondary">
                  Continuez comme ça
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Chaque trajet responsable contribue à réduire votre impact carbone.
                </p>

              </div>

            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">

              <div className="rounded-[16px] bg-background p-3">

                <p className="uf-caption text-muted">
                  Trajets
                </p>

                <p className="uf-label mt-1 text-secondary">
                  {journeyCount}
                </p>

              </div>

              <div className="rounded-[16px] bg-background p-3">

                <p className="uf-caption text-muted">
                  CO₂
                </p>

                <p className="uf-label mt-1 text-primary">
                  {co2Saved.toFixed(2)} kg
                </p>

              </div>

              <div className="rounded-[16px] bg-background p-3">

                <p className="uf-caption text-muted">
                  FLOWS
                </p>

                <p className="uf-label mt-1 text-secondary">
                  {flows}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* Derniers trajets */}
        <section className="mt-8">

          <div className="flex items-end justify-between">

            <div>

              <h2 className="uf-h3 text-secondary">
                Derniers trajets
              </h2>

              <p className="uf-caption mt-1 text-muted">
                Vos déplacements récemment validés
              </p>

            </div>

            <Link
              href="/trajets"
              className="uf-caption font-semibold text-primary"
            >
              Voir tout
            </Link>

          </div>

          {!recentJourneys ||
          recentJourneys.length === 0 ? (
            <div className="uf-card mt-4 p-5 text-center">

              <TrainFront
                size={22}
                className="mx-auto text-primary"
              />

              <p className="uf-label mt-3 text-secondary">
                Aucun trajet validé
              </p>

              <p className="uf-caption mt-1 text-muted">
                Vos derniers déplacements apparaîtront ici.
              </p>

            </div>
          ) : (
            <div className="mt-4 space-y-3">

              {recentJourneys.map(
                (journey) => (
                  <div
                    key={journey.id}
                    className="uf-card p-4"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="min-w-0">

                        <p className="uf-label text-secondary">
                          {getModeLabel(
                            journey.transport_mode
                          )}
                        </p>

                        <p className="uf-caption mt-1 truncate text-muted">
                          {journey.destination_name ??
                            "Destination"}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="uf-caption text-muted">
                          {formatDistance(
                            journey.distance_meters
                          )}
                        </p>

                        <div className="mt-1 flex items-center justify-end gap-1 text-primary">

                          <Sparkles size={12} />

                          <span className="uf-caption font-semibold">
                            +{journey.flows_earned}
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* Raccourcis */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Accès rapide
          </h2>

          <div className="mt-4 space-y-3">

            <Link
              href="/trajets"
              className="uf-card flex items-center gap-3 p-4"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <TrainFront size={18} />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Mes trajets
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Planifier et consulter vos déplacements
                </p>

              </div>

              <ArrowRight
                size={17}
                className="text-subtle"
              />

            </Link>

            <Link
              href="/recompenses"
              className="uf-card flex items-center gap-3 p-4"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <Sparkles size={18} />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Mes récompenses
                </p>

                <p className="uf-caption mt-1 text-muted">
                  {flows} FLOWS disponibles
                </p>

              </div>

              <ArrowRight
                size={17}
                className="text-subtle"
              />

            </Link>

          </div>

        </section>

      </div>

      <BottomNavigation />

    </main>
  );
}