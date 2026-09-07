import {
  Bike,
  Car,
  CheckCircle2,
  Footprints,
  Leaf,
  Route,
  Sparkles,
  TrainFront,
} from "lucide-react";

import BottomNavigation from "@/components/layout/BottomNavigation";
import { createClient } from "@/lib/supabase/server";

type Journey = {
  id: string;
  status: string;
  transport_mode: string;
  distance_meters: number | null;
  co2_saved: number | null;
  flows_earned: number | null;
};

type Challenge = {
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  completed: boolean;
  icon: typeof Leaf;
};

function formatDistance(
  distanceMeters: number
) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatChallengeProgress(
  current: number,
  target: number,
  unit: string
) {
  if (unit === "kg") {
    return `${current.toFixed(1)} / ${target} kg`;
  }

  if (unit === "km") {
    return `${current.toFixed(1)} / ${target} km`;
  }

  return `${Math.round(current)} / ${target}`;
}

export default async function RecompensesPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  /*
   * Profil utilisateur
   */
  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(`
        flows,
        co2_saved
      `)
      .eq(
        "id",
        user.id
      )
      .single();

  /*
   * Trajets validés / récompensés
   */
  const {
    data: journeysData,
  } =
    await supabase
      .from("journeys")
      .select(`
        id,
        status,
        transport_mode,
        distance_meters,
        co2_saved,
        flows_earned
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
        "created_at",
        {
          ascending:
            false,
        }
      );

  const journeys =
    (journeysData ??
      []) as Journey[];

  /*
   * Statistiques générales
   */
  const totalFlows =
    Number(
      profile?.flows ??
        0
    );

  const totalCO2Saved =
    Number(
      profile?.co2_saved ??
        0
    );

  const totalJourneys =
    journeys.length;

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

  /*
   * Statistiques par mode
   */
  const bikeDistanceMeters =
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
      );

  const walkingDistanceMeters =
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
      );

  const transitJourneys =
    journeys.filter(
      (journey) =>
        journey.transport_mode ===
          "transit" ||
        journey.transport_mode ===
          "metro" ||
        journey.transport_mode ===
          "bus" ||
        journey.transport_mode ===
          "tram" ||
        journey.transport_mode ===
          "train"
    ).length;

  const bikeDistanceKm =
    bikeDistanceMeters /
    1000;

  const walkingDistanceKm =
    walkingDistanceMeters /
    1000;

  /*
   * Équivalence CO₂
   *
   * UrbanFlow utilise déjà une voiture
   * thermique de référence à 0,192 kg
   * de CO₂ par kilomètre.
   */
  const CAR_CO2_KG_PER_KM =
    0.192;

  const avoidedCarKm =
    totalCO2Saved > 0
      ? totalCO2Saved /
        CAR_CO2_KG_PER_KM
      : 0;

  /*
   * Défis UrbanFlow
   */
  const challenges: Challenge[] =
    [
      {
        title:
          "Éco-départ",

        description:
          "Validez 3 trajets responsables.",

        current:
          totalJourneys,

        target:
          3,

        unit:
          "trajets",

        completed:
          totalJourneys >=
          3,

        icon:
          Leaf,
      },

      {
        title:
          "Roulez vert",

        description:
          "Parcourez 10 km à vélo.",

        current:
          bikeDistanceKm,

        target:
          10,

        unit:
          "km",

        completed:
          bikeDistanceKm >=
          10,

        icon:
          Bike,
      },

      {
        title:
          "Mobilité durable",

        description:
          "Économisez 5 kg de CO₂.",

        current:
          totalCO2Saved,

        target:
          5,

        unit:
          "kg",

        completed:
          totalCO2Saved >=
          5,

        icon:
          Leaf,
      },

      {
        title:
          "Marche active",

        description:
          "Parcourez 5 km à pied.",

        current:
          walkingDistanceKm,

        target:
          5,

        unit:
          "km",

        completed:
          walkingDistanceKm >=
          5,

        icon:
          Footprints,
      },

      {
        title:
          "Transport malin",

        description:
          "Effectuez 5 trajets en transports en commun.",

        current:
          transitJourneys,

        target:
          5,

        unit:
          "trajets",

        completed:
          transitJourneys >=
          5,

        icon:
          TrainFront,
      },
    ];

  const completedChallenges =
    challenges.filter(
      (challenge) =>
        challenge.completed
    );

  const activeChallenges =
    challenges.filter(
      (challenge) =>
        !challenge.completed
    );

  return (
    <main className="min-h-screen bg-background pb-28">

      <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-7">

        {/* Header */}
        <header>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">

            <Leaf
              size={22}
            />

          </div>

          <h1 className="uf-h1 mt-4 text-secondary">
            Mon impact
          </h1>

          <p className="uf-body mt-2 text-muted">
            Suivez l&apos;impact positif de vos déplacements et progressez dans vos défis.
          </p>

        </header>

        {/* Statistiques principales */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Votre bilan
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <div className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">

                <Leaf
                  size={18}
                />

              </div>

              <p className="mt-4 text-2xl font-bold text-secondary">
                {totalCO2Saved.toFixed(
                  2
                )}
              </p>

              <p className="uf-caption mt-1 text-muted">
                kg CO₂ économisés
              </p>

            </div>

            <div className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">

                <Sparkles
                  size={18}
                />

              </div>

              <p className="mt-4 text-2xl font-bold text-secondary">
                {totalFlows}
              </p>

              <p className="uf-caption mt-1 text-muted">
                FLOWS
              </p>

            </div>

            <div className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-soft text-secondary">

                <Route
                  size={18}
                />

              </div>

              <p className="mt-4 text-2xl font-bold text-secondary">
                {totalJourneys}
              </p>

              <p className="uf-caption mt-1 text-muted">
                trajets validés
              </p>

            </div>

            <div className="uf-card p-4">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">

                <Footprints
                  size={18}
                />

              </div>

              <p className="mt-4 text-2xl font-bold text-secondary">
                {formatDistance(
                  totalDistanceMeters
                )}
              </p>

              <p className="uf-caption mt-1 text-muted">
                mobilité responsable
              </p>

            </div>

          </div>

        </section>

        {/* Impact en perspective */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Votre impact en perspective
          </h2>

          <div className="uf-card mt-4 p-5">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">

                <Car
                  size={21}
                />

              </div>

              <div className="min-w-0 flex-1">

                <p className="uf-label text-secondary">
                  {totalCO2Saved.toFixed(
                    2
                  )}{" "}
                  kg de CO₂ économisés
                </p>

                {totalCO2Saved >
                0 ? (
                  <p className="uf-body mt-2 text-muted">
                    Cela correspond à environ{" "}
                    <span className="font-semibold text-primary">
                      {Math.round(
                        avoidedCarKm
                      )}{" "}
                      km
                    </span>{" "}
                    parcourus en voiture thermique.
                  </p>
                ) : (
                  <p className="uf-body mt-2 text-muted">
                    Validez vos premiers trajets responsables pour visualiser votre impact.
                  </p>
                )}

                <div className="mt-4 flex items-start gap-2">

                  <Leaf
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                  />

                  <p className="uf-caption text-muted">
                    Cette équivalence permet de rendre vos économies de CO₂ plus concrètes.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* Progression */}
        <section className="mt-8">

          <div className="flex items-center justify-between">

            <h2 className="uf-h3 text-secondary">
              Défis
            </h2>

            <p className="uf-caption font-semibold text-primary">
              {
                completedChallenges.length
              }
              /
              {
                challenges.length
              }{" "}
              terminés
            </p>

          </div>

          {activeChallenges.length >
          0 && (
            <div className="mt-4 space-y-3">

              {activeChallenges.map(
                (
                  challenge
                ) => {
                  const Icon =
                    challenge.icon;

                  const percentage =
                    Math.min(
                      100,
                      Math.max(
                        0,
                        (challenge.current /
                          challenge.target) *
                          100
                      )
                    );

                  return (
                    <div
                      key={
                        challenge.title
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

                            <p className="uf-caption shrink-0 font-semibold text-primary">
                              {formatChallengeProgress(
                                challenge.current,
                                challenge.target,
                                challenge.unit
                              )}
                            </p>

                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-soft">

                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width:
                                  `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* Défis terminés */}
        {completedChallenges.length >
          0 && (
          <section className="mt-8">

            <h2 className="uf-h3 text-secondary">
              Défis terminés
            </h2>

            <div className="mt-4 space-y-3">

              {completedChallenges.map(
                (
                  challenge
                ) => {
                  const Icon =
                    challenge.icon;

                  return (
                    <div
                      key={
                        challenge.title
                      }
                      className="uf-card flex items-center gap-4 p-4"
                    >

                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">

                        <Icon
                          size={18}
                        />

                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">

                          <CheckCircle2
                            size={13}
                          />

                        </div>

                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="uf-label text-secondary">
                          {
                            challenge.title
                          }
                        </p>

                        <p className="uf-caption mt-1 text-muted">
                          Défi terminé
                        </p>

                      </div>

                      <CheckCircle2
                        size={20}
                        className="shrink-0 text-primary"
                      />

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

      </div>

      <BottomNavigation />

    </main>
  );
}
