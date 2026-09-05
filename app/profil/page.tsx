import {
  Bike,
  Bus,
  ChevronRight,
  CircleHelp,
  Footprints,
  Leaf,
  Mail,
  Settings,
  ShieldCheck,
  TrainFront,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import BottomNavigation from "@/components/layout/BottomNavigation";
import SavedPlaces from "@/components/profile/SavedPlaces";
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

  const [
    profileResult,
    journeysResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        first_name,
        last_name,
        flows,
        co2_saved,
        preferred_metro,
        preferred_bus,
        preferred_bike,
        preferred_walk,
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
          count: "exact",
          head: true,
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
  ]);

  const profile =
    profileResult.data;

  const validatedJourneys =
    journeysResult.count ??
    0;

  const firstName =
    profile?.first_name ||
    user.user_metadata
      ?.first_name ||
    "";

  const lastName =
    profile?.last_name ||
    user.user_metadata
      ?.last_name ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    "Utilisateur UrbanFlow";

  const flows =
    Number(
      profile?.flows ??
        0
    );

  const co2Saved =
    Number(
      profile?.co2_saved ??
        0
    );

  const preferences = [
    {
      label: "Métro / Train",
      icon: TrainFront,
      enabled:
        profile?.preferred_metro ??
        true,
    },
    {
      label: "Bus",
      icon: Bus,
      enabled:
        profile?.preferred_bus ??
        true,
    },
    {
      label: "Vélo",
      icon: Bike,
      enabled:
        profile?.preferred_bike ??
        true,
    },
    {
      label: "Marche",
      icon: Footprints,
      enabled:
        profile?.preferred_walk ??
        false,
    },
  ];

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">

        <header>
          <p className="uf-body text-muted">
            Votre espace
          </p>

          <h1 className="uf-h2 mt-1 text-secondary">
            Profil
          </h1>
        </header>

        {/* Profil utilisateur */}
        <section className="uf-card mt-6 p-5">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UserRound
                size={23}
              />
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-lg font-bold text-secondary">
                {fullName}
              </p>

              <div className="mt-1 flex items-center gap-2 text-muted">

                <Mail
                  size={14}
                />

                <p className="uf-caption truncate">
                  {user.email}
                </p>

              </div>

            </div>

            <Link
              href="/profil/modifier"
              className="uf-caption font-semibold text-primary"
            >
              Modifier
            </Link>

          </div>

        </section>

        {/* Statistiques */}
        <section className="mt-6 grid grid-cols-3 gap-3">

          <article className="uf-card p-4">

            <Leaf
              size={18}
              className="text-primary"
            />

            <p className="mt-3 text-lg font-bold text-secondary">
              {co2Saved.toFixed(1)}
            </p>

            <p className="uf-caption mt-1 text-muted">
              kg CO₂
            </p>

          </article>

          <article className="uf-card p-4">

            <div className="flex h-[18px] items-center">
              <span className="text-lg text-secondary">
                ✦
              </span>
            </div>

            <p className="mt-3 text-lg font-bold text-secondary">
              {flows}
            </p>

            <p className="uf-caption mt-1 text-muted">
              FLOWS
            </p>

          </article>

          <article className="uf-card p-4">

            <TrainFront
              size={18}
              className="text-primary"
            />

            <p className="mt-3 text-lg font-bold text-secondary">
              {validatedJourneys}
            </p>

            <p className="uf-caption mt-1 text-muted">
              trajets
            </p>

          </article>

        </section>

        {/* Préférences mobilité */}
        <section className="mt-8">

          <div className="flex items-center justify-between">

            <h2 className="uf-h3 text-secondary">
              Préférences de mobilité
            </h2>

            <Link
              href="/profil/modifier"
              className="uf-caption font-semibold text-primary"
            >
              Modifier
            </Link>

          </div>

          <div className="uf-card mt-4 grid grid-cols-2 gap-3 p-4">

            {preferences.map(
              ({
                label,
                icon: Icon,
                enabled,
              }) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-[16px] border p-3 ${
                    enabled
                      ? "border-primary/20 bg-primary-soft"
                      : "border-border bg-background"
                  }`}
                >

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      enabled
                        ? "bg-primary text-white"
                        : "bg-surface text-muted"
                    }`}
                  >
                    <Icon
                      size={16}
                    />
                  </div>

                  <div>

                    <p className="uf-caption font-semibold text-secondary">
                      {label}
                    </p>

                    <p
                      className={`mt-1 text-[11px] ${
                        enabled
                          ? "text-primary"
                          : "text-subtle"
                      }`}
                    >
                      {enabled
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
        <SavedPlaces
          homeAddress={
            profile?.home_address
          }
          workAddress={
            profile?.work_address
          }
        />

        {/* Paramètres du compte */}
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
                  className={`flex items-center gap-4 p-4 ${
                    index !==
                    settings.length -
                      1
                      ? "border-b border-border"
                      : ""
                  }`}
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon
                      size={18}
                    />
                  </div>

                  <p className="uf-label flex-1 text-secondary">
                    {label}
                  </p>

                  <ChevronRight
                    size={18}
                    className="text-subtle"
                  />

                </Link>
              )
            )}

          </div>

        </section>

        <div className="mt-8">
          <LogoutButton />
        </div>

      </div>

      <BottomNavigation />
    </main>
  );
}