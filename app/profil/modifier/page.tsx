"use client";

import {
  Bike,
  Bus,
  Footprints,
  Home,
  LoaderCircle,
  MapPin,
  Save,
  TrainFront,
} from "lucide-react";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  first_name: string | null;
  last_name: string | null;

  preferred_metro: boolean;
  preferred_bus: boolean;
  preferred_bike: boolean;
  preferred_walk: boolean;

  home_address: string | null;
  work_address: string | null;
};

export default function ModifierProfilPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [homeAddress, setHomeAddress] =
    useState("");

  const [workAddress, setWorkAddress] =
    useState("");

  const [
    preferredMetro,
    setPreferredMetro,
  ] = useState(false);

  const [
    preferredBus,
    setPreferredBus,
  ] = useState(false);

  const [
    preferredBike,
    setPreferredBike,
  ] = useState(false);

  const [
    preferredWalk,
    setPreferredWalk,
  ] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select(`
            first_name,
            last_name,
            preferred_metro,
            preferred_bus,
            preferred_bike,
            preferred_walk,
            home_address,
            work_address
          `)
          .eq("id", user.id)
          .single();

      if (error) {
        console.error(
          "Erreur profil :",
          error
        );

        setError(
          "Impossible de charger votre profil."
        );

        setLoading(false);
        return;
      }

      const profile =
        data as ProfileData;

      setFirstName(
        profile.first_name ??
          ""
      );

      setLastName(
        profile.last_name ??
          ""
      );

      setPreferredMetro(
        profile.preferred_metro
      );

      setPreferredBus(
        profile.preferred_bus
      );

      setPreferredBike(
        profile.preferred_bike
      );

      setPreferredWalk(
        profile.preferred_walk
      );

      setHomeAddress(
        profile.home_address ??
          ""
      );

      setWorkAddress(
        profile.work_address ??
          ""
      );

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!firstName.trim()) {
      setError(
        "Le prénom est obligatoire."
      );

      return;
    }

    setSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          "/connexion"
        );
        return;
      }

      const {
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            first_name:
              firstName.trim(),

            last_name:
              lastName.trim(),

            preferred_metro:
              preferredMetro,

            preferred_bus:
              preferredBus,

            preferred_bike:
              preferredBike,

            preferred_walk:
              preferredWalk,

            home_address:
              homeAddress.trim() ||
              null,

            work_address:
              workAddress.trim() ||
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            user.id
          );

      if (error) {
        throw error;
      }

      /*
       * On garde également les
       * métadonnées Auth synchronisées.
       */
      await supabase.auth.updateUser({
        data: {
          first_name:
            firstName.trim(),

          last_name:
            lastName.trim(),
        },
      });

      setSuccess(
        "Votre profil a été mis à jour."
      );

      router.refresh();
    } catch (error) {
      console.error(
        error
      );

      setError(
        "Impossible d'enregistrer les modifications."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex min-h-[70vh] items-center justify-center">

          <LoaderCircle
            className="animate-spin text-primary"
            size={24}
          />

        </div>
      </main>
    );
  }

  const mobilityOptions = [
    {
      label: "Métro",
      icon: TrainFront,
      active: preferredMetro,
      toggle: () =>
        setPreferredMetro(
          (value) => !value
        ),
    },
    {
      label: "Bus",
      icon: Bus,
      active: preferredBus,
      toggle: () =>
        setPreferredBus(
          (value) => !value
        ),
    },
    {
      label: "Vélo",
      icon: Bike,
      active: preferredBike,
      toggle: () =>
        setPreferredBike(
          (value) => !value
        ),
    },
    {
      label: "Marche",
      icon: Footprints,
      active: preferredWalk,
      toggle: () =>
        setPreferredWalk(
          (value) => !value
        ),
    },
  ];

  return (
    <main className="min-h-screen bg-background">

      <div className="mx-auto w-full max-w-[430px] px-5 pb-10 pt-7">

        <header>

          <Link
            href="/profil"
            className="uf-caption font-semibold text-primary"
          >
            ← Retour au profil
          </Link>

          <h1 className="uf-h2 mt-5 text-secondary">
            Modifier mon profil
          </h1>

          <p className="uf-body mt-2 text-muted">
            Gérez vos informations et vos préférences UrbanFlow.
          </p>

        </header>

        {/* Informations */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Informations personnelles
          </h2>

          <div className="uf-card mt-4 space-y-4 p-5">

            <div>

              <label
                htmlFor="firstName"
                className="uf-label text-secondary"
              >
                Prénom
              </label>

              <input
                id="firstName"
                value={firstName}
                onChange={(event) =>
                  setFirstName(
                    event.target.value
                  )
                }
                className="uf-input mt-2"
              />

            </div>

            <div>

              <label
                htmlFor="lastName"
                className="uf-label text-secondary"
              >
                Nom
              </label>

              <input
                id="lastName"
                value={lastName}
                onChange={(event) =>
                  setLastName(
                    event.target.value
                  )
                }
                className="uf-input mt-2"
              />

            </div>

          </div>

        </section>

        {/* Mobilité */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Préférences de mobilité
          </h2>

          <p className="uf-caption mt-1 text-muted">
            Sélectionnez vos modes de transport privilégiés.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {mobilityOptions.map(
              ({
                label,
                icon: Icon,
                active,
                toggle,
              }) => (
                <button
                  key={label}
                  type="button"
                  onClick={t