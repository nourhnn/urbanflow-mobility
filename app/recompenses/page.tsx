import {
  Bike,
  CheckCircle2,
  Footprints,
  Leaf,
  Sparkles,
  Target,
  TrainFront,
  Trophy,
} from "lucide-react";

import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import { createClient } from "@/lib/supabase/server";

type Journey = {
  id: string;
  transport_mode: string;
  distance_meters: number | null;
  co2_saved: number | null;
  status: string;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  icon: typeof Target;
  current: number;
  target: number;
  unit: string;
  completed: boolean;
};

function formatNumber(
  value: number,
  digits = 1
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits:
        digits,
    }
  ).format(value);
}

function calculateProgress(
  current: number,
  target: number
) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (current / target) *
        100
    )
  );
}

export default async function RecompensesPage() {
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
    journeysResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(`
          flows,
          co2_saved
        `)
        .eq(
          "id",
          user.id
        )
        .single(),

      supabase
        .from("journeys")
        .select(`
          id,
          transport_mode,
          distance_meters,
          co2_saved,
          status
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "rewarded"
        ),
    ]);

  const profile =
    profileResult.data;

  const journeys =
    (journeysResult.data ??
      []) as Journey[];

  const validatedJourneys =
    journeys.length;

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

  const totalDistanceMeters =
    journeys.reduce(
      (
        total,
        journey
      ) =>
        total +
        Number(
          journey.distance_meters ??
            0
        ),
      0
    );

  const totalDistanceKm =
    totalDistanceMeters /
    1000;

  const cyclingDistanceKm =
    journeys
      .filter(
        (journey) =>
          journey.transport_mode ===
          "cycling"
      )
      .reduce(
        (
          total,
          journey
        ) =>
          total +
          Number(
            journey.distance_meters ??
              0
          ),
        0
      ) / 1000;

  const walkingDistanceKm =
    journeys
      .filter(
        (journey) =>
          journey.transport_mode ===
          "walking"
      )
      .reduce(
        (
          total,
          journey
        ) =>
          total +
          Number(
            journey.distance_meters ??
              0
          ),
        0
      ) / 1000;

  const transitJourneys =
    journeys.filter(
      (journey) =>
        [
          "transit",
          "metro",
          "bus",
          "tram",
          "train",
          "multimodal",
        ].includes(
          journey.transport_mode
        )
    ).length;

  const challenges: Challenge[] =
    [
      {
        id: "eco-start",
        title:
          "Éco-départ",
        description:
          "Effectuer 3 trajets responsables.",
        icon: Leaf,
        current:
          validatedJourneys,
        target: 3,
        unit:
          "trajets",
        completed:
          validatedJourneys >=
          3,
      },
      {
        id: "bike",
        title:
          "Roulez vert",
        description:
          "Parcourir 10 km à vélo.",
        icon: Bike,
        current:
          cyclingDistanceKm,
        target: 10,
        unit: "km",
        completed:
          cyclingDistanceKm >=
          10,
      },
      {
        id: "co2",
        title:
          "Mobilité durable",
        description:
          "Économiser 5 kg de CO₂.",
        icon: Leaf,
        current:
          totalCO2Saved,
        target: 5,
        unit:
          "kg",
        completed:
          totalCO2Saved >= 5,
      },
      {
        id: "walking",
        title:
          "Marche active",
        description:
          "Parcourir 5 km à pied.",
        icon:
          Footprints,
        current:
          walkingDistanceKm,
        target: 5,
        unit: "km",
        completed:
          walkingDistanceKm >=
          5,
      },
      {
        id: "transit",
        title:
          "Transport malin",
        description:
          "Effectuer 5 trajets en transports en commun.",
        icon:
          TrainFront,
        current:
          transitJourneys,
        target: 5,
        unit:
          "trajets",
        completed:
          transitJourneys >=
          5,
      },
    ];

  const activeChallenges =
    challenges.filter(
      (challenge) =>
        !challenge.completed
    );

  const completedChallenges =
    challenges.filter(
      (challenge) =>
        challenge.completed
    );

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        <header>
          <p className="uf-body text-muted">
            Votre progression
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Impact
          </h1>
        </header>

        {/* Carte principale */}
        <section className="mt-6 rounded-[24px] bg-primary p-5 text-white">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm opacity-80">
                Score UrbanFlow
              </p>

              <p className="mt-1 text-3xl font-bold">
                {totalFlows}
              </p>

              <p className="mt-1 text-sm opacity-80">
                FLOWS
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Sparkles
                size={24}
              />
            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-[18px] bg-white/10 p-4">
              <p className="text-2xl font-semibold">
                {
                  validatedJourneys
                }
              </p>

              <p className="mt-1 text-xs opacity-80">
                trajets validés
              </p>
            </div>

            <div className="rounded-[18px] bg-white/10 p-4">
              <p className="text-2xl font-semibold">
                {formatNumber(
                  totalCO2Saved
                )}{" "}
                kg
              </p>

              <p className="mt-1 text-xs opacity-80">
                CO₂ économisé
              </p>
            </div>

          </div>

        </section>

        {/* Impact */}
        <section className="mt-8">

          <div className="flex items-center gap-2">
            <Leaf
              size={18}
              className="text-primary"
            />

            <h2 className="uf-h3 text-secondary">
              Votre impact
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <article className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Leaf
                  size={18}
                />
              </div>

              <p className="mt-4 text-xl font-bold text-secondary">
                {formatNumber(
                  totalCO2Saved
                )}{" "}
                kg
              </p>

              <p className="uf-caption mt-1 text-muted">
                de CO₂ économisé
              </p>

            </article>

            <article className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <Target
                  size={18}
                />
              </div>

              <p className="mt-4 text-xl font-bold text-secondary">
                {formatNumber(
                  totalDistanceKm
                )}{" "}
                km
              </p>

              <p className="uf-caption mt-1 text-muted">
                parcourus responsablement
              </p>

            </article>

          </div>

        </section>

        {/* Défis en cours */}
        <section className="mt-8">

          <div className="flex items-center gap-2">

            <Target
              size={18}
              className="text-primary"
            />

            <h2 className="uf-h3 text-secondary">
              Défis en cours
            </h2>

          </div>

          {activeChallenges.length >
          0 ? (
            <div className="mt-4 space-y-3">

              {activeChallenges.map(
                (
                  challenge
                ) => {
                  const Icon =
                    challenge.icon;

                  const progress =
                    calculateProgress(
                      challenge.current,
                      challenge.target
                    );

                  return (
                    <article
                      key={
                        challenge.id
                      }
                      className="uf-card p-5"
                    >

                      <div className="flex items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <Icon
                            size={19}
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div>
                              <p className="uf-label text-secondary">
                                {
                                  challenge.title
                                }
                              </p>

                              <p className="uf-caption mt-1 text-muted">
                                {
                                  challenge.description
                                }
                              </p>
                            </div>

                            <span className="uf-caption shrink-0 font-semibold text-primary">
                              {
                                progress
                              }
                              %
                            </span>

                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">

                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${progress}%`,
                              }}
                            />

                          </div>

                          <div className="mt-2 flex items-center justify-between">

                            <p className="uf-caption text-muted">
                              {formatNumber(
                                Math.min(
                                  challenge.current,
                                  challenge.target
                                )
                              )}{" "}
                              /{" "}
                              {
                                challenge.target
                              }{" "}
                              {
                                challenge.unit
                              }
                            </p>

                            <p className="uf-caption font-semibold text-secondary">
                              Encore{" "}
                              {formatNumber(
                                Math.max(
                                  0,
                                  challenge.target -
                                    challenge.current
                                )
                              )}{" "}
                              {
                                challenge.unit
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          ) : (
            <div className="uf-card mt-4 p-5 text-center">

              <Trophy
                size={24}
                className="mx-auto text-primary"
              />

              <p className="uf-label mt-3 text-secondary">
                Tous les défis sont accomplis
              </p>

              <p className="uf-caption mt-1 text-muted">
                Beau parcours. De nouveaux défis pourront être ajoutés prochainement.
              </p>

            </div>
          )}

        </section>

        {/* Défis accomplis */}
        <section className="mt-8">

          <div className="flex items-center gap-2">

            <CheckCircle2
              size={18}
              className="text-primary"
            />

            <h2 className="uf-h3 text-secondary">
              Défis accomplis
            </h2>

          </div>

          {completedChallenges.length >
          0 ? (
            <div className="mt-4 space-y-3">

              {completedChallenges.map(
                (
                  challenge
                ) => {
                  const Icon =
                    challenge.icon;

                  return (
                    <article
                      key={
                        challenge.id
                      }
                      className="uf-card flex items-center gap-4 p-4"
                    >

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon
                          size={18}
                        />
                      </div>

                      <div className="flex-1">

                        <p className="uf-label text-secondary">
                          {
                            challenge.title
                          }
                        </p>

                        <p className="uf-caption mt-1 text-muted">
                          {
                            challenge.description
                          }
                        </p>

                      </div>

                      <CheckCircle2
                        size={20}
                        className="text-primary"
                      />

                    </article>
                  );
                }
              )}

            </div>
          ) : (
            <div className="uf-card mt-4 p-5">

              <p className="uf-body text-muted">
                Vos premiers défis apparaîtront ici dès qu&apos;ils seront accomplis.
              </p>

            </div>
          )}

        </section>

      </div>

      <BottomNavigation />
    </main>
  );
}