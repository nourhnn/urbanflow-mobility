import {
  Bike,
  Bus,
  ChevronRight,
  Footprints,
  Leaf,
  MapPin,
  Sparkles,
  TrainFront,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import SavedPlaces from "@/components/profile/SavedPlaces";
import { createClient } from "@/lib/supabase/server";

type RecentJourney = {
  id: string;
  transport_mode: string;
  destination_name: string | null;
  distance_meters: number | null;
  flows_earned: number | null;
  co2_saved: number | null;
  completed_at: string | null;
  created_at: string;
};

function formatDistance(
  meters: number | null
) {
  const value =
    Number(meters ?? 0);

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(
    value / 1000
  ).toFixed(1)} km`;
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "numeric",
      month: "short",
    }
  ).format(
    new Date(value)
  );
}

function getModeDetails(
  mode: string
) {
  switch (mode) {
    case "walking":
      return {
        label: "Marche",
        icon: Footprints,
      };

    case "cycling":
      return {
        label: "Vélo",
        icon: Bike,
      };

    case "driving":
      return {
        label: "Voiture",
        icon: MapPin,
      };

    case "metro":
      return {
        label: "Métro",
        icon: TrainFront,
      };

    case "bus":
      return {
        label: "Bus",
        icon: Bus,
      };

    case "tram":
    case "train":
    case "transit":
    case "multimodal":
      return {
        label:
          "Transports",
        icon: TrainFront,
      };

    default:
      return {
        label: "Trajet",
        icon: MapPin,
      };
  }
}

export default async function AccueilPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const [
    profileResult,
    rewardedJourneysResult,
    recentJourneysResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(`
          first_name,
          flows,
          co2_saved,
          home_address,
          work_address
        `)
        .eq("id", user.id)
        .single(),

      supabase
        .from("journeys")
        .select(
          "id",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "rewarded"
        ),

      supabase
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
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "rewarded"
        )
        .order(
          "completed_at",
          {
            ascending:
              false,
          }
        )
        .limit(3),
    ]);

  const profile =
    profileResult.data;

  const validatedJourneys =
    rewardedJourneysResult.count ??
    0;

  const recentJourneys =
    (recentJourneysResult.data ??
      []) as RecentJourney[];

  const firstName =
    profile?.first_name ||
    user.user_metadata
      ?.first_name ||
    "";

  const totalCO2Saved =
    Number(
      profile?.co2_saved ??
        0
    );

  const totalFlows =
    Number(
      profile?.flows ??
        0
    );

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        {/* Header */}
        <header>

          <p className="uf-body text-muted">
            Bonjour
            {firstName
              ? ` ${firstName}`
              : ""}
            👋
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Où allons-nous aujourd&apos;hui ?
          </h1>

        </header>

        {/* Planifier un trajet */}
        <Link
          href="/trajets"
          className="mt-6 block rounded-[24px] bg-primary p-5 text-white"
        >

          <div className="flex items-start justify-between gap-5">

            <div>

              <p className="text-sm font-medium opacity-80">
                Planifier un trajet
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Trouvez votre meilleur itinéraire
              </h2>

              <p className="mt-2 max-w-[260px] text-sm leading-5 opacity-80">
                Comparez marche, vélo, voiture et transports en commun.
              </p>

            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <MapPin
                size={21}
              />
            </div>

          </div>

          <div className="mt-5 flex items-center gap-2 text-sm font-semibold">
            Rechercher un trajet

            <ChevronRight
              size={17}
            />
          </div>

        </Link>

        {/* Lieux enregistrés */}
        <SavedPlaces
          homeAddress={
            profile?.home_address
          }
          workAddress={
            profile?.work_address
          }
          compact
        />

        {/* Raccourcis transports */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Se déplacer
          </h2>

          <div className="mt-4 grid grid-cols-4 gap-2">

            <Link
              href="/trajets"
              className="uf-card flex min-h-[86px] flex-col items-center justify-center gap-2 p-3 text-center"
            >
              <Footprints
                size={20}
                className="text-primary"
              />

              <span className="text-xs font-semibold text-secondary">
                Marche
              </span>
            </Link>

            <Link
              href="/trajets"
              className="uf-card flex min-h-[86px] flex-col items-center justify-center gap-2 p-3 text-center"
            >
              <Bike
                size={20}
                className="text-primary"
              />

              <span className="text-xs font-semibold text-secondary">
                Vélo
              </span>
            </Link>

            <Link
              href="/trajets"
              className="uf-card flex min-h-[86px] flex-col items-center justify-center gap-2 p-3 text-center"
            >
              <Bus
                size={20}
                className="text-primary"
              />

              <span className="text-xs font-semibold text-secondary">
                Bus
              </span>
            </Link>

            <Link
              href="/trajets"
              className="uf-card flex min-h-[86px] flex-col items-center justify-center gap-2 p-3 text-center"
            >
              <TrainFront
                size={20}
                className="text-primary"
              />

              <span className="text-xs font-semibold text-secondary">
                Métro
              </span>
            </Link>

          </div>

        </section>

        {/* Impact */}
        <section className="mt-8">

          <div className="flex items-center justify-between">

            <h2 className="uf-h3 text-secondary">
              Votre impact
            </h2>

            <Link
              href="/recompenses"
              className="uf-caption font-semibold text-primary"
            >
              Voir plus
            </Link>

          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">

            <article className="uf-card p-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Leaf
                  size={17}
                />
              </div>

              <p className="mt-3 text-lg font-bold text-secondary">
                {totalCO2Saved.toFixed(
                  1
                )}
              </p>

              <p className="uf-caption mt-1 text-muted">
                kg CO₂
              </p>

            </article>

            <article className="uf-card p-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <Sparkles
                  size={17}
                />
              </div>

              <p className="mt-3 text-lg font-bold text-secondary">
                {
                  totalFlows
                }
              </p>

              <p className="uf-caption mt-1 text-muted">
                FLOWS
              </p>

            </article>

            <article className="uf-card p-4">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                <MapPin
                  size={17}
                />
              </div>

              <p className="mt-3 text-lg font-bold text-secondary">
                {
                  validatedJourneys
                }
              </p>

              <p className="uf-caption mt-1 text-muted">
                trajets
              </p>

            </article>

          </div>

        </section>

        {/* Derniers trajets */}
        <section className="mt-8">

          <div className="flex items-center justify-between">

            <h2 className="uf-h3 text-secondary">
              Derniers trajets
            </h2>

            <Link
              href="/trajets"
              className="uf-caption font-semibold text-primary"
            >
              Historique
            </Link>

          </div>

          {recentJourneys.length >
          0 ? (
            <div className="mt-4 space-y-3">

              {recentJourneys.map(
                (
                  journey
                ) => {
                  const {
                    label,
                    icon:
                      Icon,
                  } =
                    getModeDetails(
                      journey.transport_mode
                    );

                  return (
                    <article
                      key={
                        journey.id
                      }
                      className="uf-card flex items-center gap-4 p-4"
                    >

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon
                          size={
                            18
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-semibold text-secondary">
                          {journey.destination_name ||
                            "Trajet UrbanFlow"}
                        </p>

                        <p className="uf-caption mt-1 text-muted">
                          {label}
                          {" • "}
                          {formatDistance(
                            journey.distance_meters
                          )}
                          {" • "}
                          {formatDate(
                            journey.completed_at ||
                              journey.created_at
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-xs font-semibold text-primary">
                          +
                          {journey.flows_earned ??
                            0}{" "}
                          FLOWS
                        </p>

                        <p className="uf-caption mt-1 text-muted">
                          {Number(
                            journey.co2_saved ??
                              0
                          ).toFixed(
                            2
                          )}{" "}
                          kg
                        </p>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          ) : (
            <div className="uf-card mt-4 p-5 text-center">

              <MapPin
                size={22}
                className="mx-auto text-primary"
              />

              <p className="uf-label mt-3 text-secondary">
                Aucun trajet pour le moment
              </p>

              <p className="uf-caption mt-1 text-muted">
                Votre historique apparaîtra ici après votre premier trajet validé.
              </p>

            </div>
          )}

        </section>

      </div>

      <BottomNavigation />
    </main>
  );
}