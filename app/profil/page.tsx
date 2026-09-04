import {
  Bike,
  Bus,
  ChevronRight,
  CircleHelp,
  Footprints,
  Leaf,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
  TrainFront,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import LogoutButton from "@/components/ui/LogoutButton";
import { createClient } from "@/lib/supabase/server";

const settings = [
  {
    label: "Informations personnelles",
    icon: UserRound,
    href: "/profil/modifier",
  },
  {
    label: "Confidentialité",
    icon: ShieldCheck,
    href: "/profil/confidentialite",
  },
  {
    label: "Paramètres",
    icon: Settings,
    href: "/profil/parametres",
  },
  {
    label: "Aide et support",
    icon: CircleHelp,
    href: "/profil/aide",
  },
];

export default async function ProfilPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        first_name,
        last_name,
        flows,
        co2_saved,
        preferred_metro,
        preferred_bus,
        preferred_bike,
        preferred_walk
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
    count: journeysCount,
    error: journeysCountError,
  } =
    await supabase
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

  const firstName =
    profile?.first_name ??
    user.user_metadata?.first_name ??
    "Utilisateur";

  const lastName =
    profile?.last_name ??
    user.user_metadata?.last_name ??
    "";

  const flows =
    profile?.flows ?? 0;

  const co2Saved =
    Number(
      profile?.co2_saved ?? 0
    );

  const validatedJourneys =
    journeysCount ?? 0;

  const initial =
    firstName.length > 0
      ? firstName
          .charAt(0)
          .toUpperCase()
      : "U";

  const mobilityPreferences = [
    {
      label: "Métro",
      icon: TrainFront,
      active:
        profile?.preferred_metro ??
        false,
    },
    {
      label: "Bus",
      icon: Bus,
      active:
        profile?.preferred_bus ??
        false,
    },
    {
      label: "Vélo",
      icon: Bike,
      active:
        profile?.preferred_bike ??
        false,
    },
    {
      label: "Marche",
      icon: Footprints,
      active:
        profile?.preferred_walk ??
        false,
    },
  ];

  return (
    <main className="min-h-screen bg-background pb-28">

      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        {/* Header */}
        <header>

          <p className="uf-body text-muted">
            Votre espace personnel
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Profil
          </h1>

        </header>

        {/* Carte utilisateur */}
        <section className="uf-card mt-6 p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
              {initial}
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-lg font-bold text-secondary">
                {firstName}{" "}
                {lastName}
              </p>

              <div className="mt-1 flex items-center gap-1.5 text-muted">

                <Mail
                  size={14}
                />

                <p className="uf-caption truncate">
                  {user.email}
                </p>

              </div>

              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-primary">

                <Leaf
                  size={13}
                />

                <span className="uf-caption font-semibold">
                  Éco voyageur
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* Statistiques */}
        <section className="mt-5 grid grid-cols-3 gap-3">

          <div className="uf-card px-2 py-4 text-center">

            <p className="text-lg font-bold text-secondary">
              {validatedJourneys}
            </p>

            <p className="uf-caption mt-1 text-muted">
              Trajets
            </p>

          </div>

          <div className="uf-card px-2 py-4 text-center">

            <p className="text-lg font-bold text-primary">
              {co2Saved.toFixed(
                2
              )}
            </p>

            <p className="uf-caption mt-1 text-muted">
              kg CO₂
            </p>

          </div>

          <div className="uf-card px-2 py-4 text-center">

            <p className="text-lg font-bold text-secondary">
              {flows}
            </p>

            <p className="uf-caption mt-1 text-muted">
              FLOWS
            </p>

          </div>

        </section>

        {/* Préférences mobilité */}
        <section className="mt-8">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="uf-h3 text-secondary">
                Vos préférences
              </h2>

              <p className="uf-caption mt-1 text-muted">
                Modes privilégiés pour vos trajets
              </p>

            </div>

            <Link
              href="/profil/modifier"
              className="uf-caption font-semibold text-primary"
            >
              Modifier
            </Link>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {mobilityPreferences.map(
              ({
                label,
                icon: Icon,
                active,
              }) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-[18px] border p-3 ${
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface"
                  }`}
                >

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      active
                        ? "bg-primary text-white"
                        : "bg-background text-subtle"
                    }`}
                  >
                    <Icon
                      size={17}
                    />
                  </div>

                  <div>

                    <p
                      className={`uf-label ${
                        active
                          ? "text-primary"
                          : "text-secondary"
                      }`}
                    >
                      {label}
                    </p>

                    <p className="uf-caption mt-0.5 text-muted">
                      {active
                        ? "Activé"
                        : "Désactivé"}
                    </p>

                  </div>

                </div>
              )
            )}

          </div>

        </section>

        {/* Lieux enregistrés */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Lieux enregistrés
          </h2>

          <div className="uf-card mt-4 overflow-hidden">

            <button
              type="button"
              className="flex w-full items-center gap-3 border-b border-border p-4 text-left"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <MapPin
                  size={18}
                />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Maison
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Aucune adresse enregistrée
                </p>

              </div>

              <ChevronRight
                size={18}
                className="text-subtle"
              />

            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 p-4 text-left"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <MapPin
                  size={18}
                />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Travail
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Aucune adresse enregistrée
                </p>

              </div>

              <ChevronRight
                size={18}
                className="text-subtle"
              />

            </button>

          </div>

        </section>

        {/* Compte */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Mon compte
          </h2>

          <div className="uf-card mt-4 overflow-hidden">

            {settings.map(
              (
                {
                  label,
                  icon: Icon,
                  href,
                },
                index
              ) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex w-full items-center gap-3 p-4 text-left ${
                    index !==
                    settings.length -
                      1
                      ? "border-b border-border"
                      : ""
                  }`}
                >

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-secondary">
                    <Icon
                      size={17}
                    />
                  </div>

                  <span className="uf-label flex-1 text-secondary">
                    {label}
                  </span>

                  <ChevronRight
                    size={18}
                    className="text-subtle"
                  />

                </Link>
              )
            )}

          </div>

        </section>

        {/* Déconnexion */}
        <section className="mb-4 mt-8">

          <LogoutButton />

          <p className="uf-caption mt-4 text-center text-subtle">
            UrbanFlow Mobility • Version 1.0
          </p>

        </section>

      </div>

      <BottomNavigation />

    </main>
  );
}