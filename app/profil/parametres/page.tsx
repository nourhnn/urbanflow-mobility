"use client";

import {
  Bike,
  Bus,
  Car,
  Footprints,
  Leaf,
  LoaderCircle,
  Ruler,
  Save,
  Sparkles,
  TrainFront,
} from "lucide-react";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type TransportMode =
  | "walking"
  | "cycling"
  | "driving"
  | "transit";

type DistanceUnit =
  | "km"
  | "m";

type ProfileSettings = {
  default_transport_mode:
    TransportMode;

  show_co2:
    boolean;

  show_flows:
    boolean;

  eco_priority:
    boolean;

  distance_unit:
    DistanceUnit;
};

const transportModes = [
  {
    id: "walking",
    label: "Marche",
    icon: Footprints,
  },
  {
    id: "cycling",
    label: "Vélo",
    icon: Bike,
  },
  {
    id: "driving",
    label: "Voiture",
    icon: Car,
  },
  {
    id: "transit",
    label: "Transports",
    icon: Bus,
  },
] satisfies {
  id: TransportMode;
  label: string;
  icon: typeof TrainFront;
}[];

export default function ParametresPage() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    defaultTransportMode,
    setDefaultTransportMode,
  ] =
    useState<TransportMode>(
      "walking"
    );

  const [
    showCO2,
    setShowCO2,
  ] =
    useState(true);

  const [
    showFlows,
    setShowFlows,
  ] =
    useState(true);

  const [
    ecoPriority,
    setEcoPriority,
  ] =
    useState(false);

  const [
    distanceUnit,
    setDistanceUnit,
  ] =
    useState<DistanceUnit>(
      "km"
    );

  useEffect(() => {
    async function loadSettings() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setError(
          "Utilisateur non authentifié."
        );

        setLoading(false);

        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select(`
            default_transport_mode,
            show_co2,
            show_flows,
            eco_priority,
            distance_unit
          `)
          .eq(
            "id",
            user.id
          )
          .single();

      if (error) {
        console.error(
          "Erreur chargement paramètres :",
          error
        );

        setError(
          "Impossible de charger vos paramètres."
        );

        setLoading(false);

        return;
      }

      const settings =
        data as ProfileSettings;

      setDefaultTransportMode(
        settings.default_transport_mode ??
          "walking"
      );

      setShowCO2(
        settings.show_co2 ??
          true
      );

      setShowFlows(
        settings.show_flows ??
          true
      );

      setEcoPriority(
        settings.eco_priority ??
          false
      );

      setDistanceUnit(
        settings.distance_unit ??
          "km"
      );

      setLoading(false);
    }

    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Utilisateur non authentifié."
        );
      }

      const {
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            default_transport_mode:
              defaultTransportMode,

            show_co2:
              showCO2,

            show_flows:
              showFlows,

            eco_priority:
              ecoPriority,

            distance_unit:
              distanceUnit,

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

      setSuccess(
        "Vos paramètres ont été enregistrés."
      );
    } catch (error) {
      console.error(
        "Erreur enregistrement paramètres :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer vos paramètres."
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
            size={24}
            className="animate-spin text-primary"
          />

        </div>
      </main>
    );
  }

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
            Paramètres
          </h1>

          <p className="uf-body mt-2 text-muted">
            Personnalisez le fonctionnement d&apos;UrbanFlow selon vos habitudes.
          </p>

        </header>

        {/* Mode de transport par défaut */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Mode de transport par défaut
          </h2>

          <p className="uf-caption mt-1 text-muted">
            Ce mode sera sélectionné automatiquement lorsque vous ouvrez le planificateur.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {transportModes.map(
              ({
                id,
                label,
                icon: Icon,
              }) => {
                const active =
                  defaultTransportMode ===
                  id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setDefaultTransportMode(
                        id
                      )
                    }
                    className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-surface"
                    }`}
                  >

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        active
                          ? "bg-primary text-white"
                          : "bg-background text-muted"
                      }`}
                    >
                      <Icon
                        size={18}
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

                      <p className="uf-caption mt-1 text-muted">
                        {active
                          ? "Par défaut"
                          : "Sélectionner"}
                      </p>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* Informations trajet */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Informations de trajet
          </h2>

          <p className="uf-caption mt-1 text-muted">
            Choisissez les informations affichées lors de la comparaison des itinéraires.
          </p>

          <div className="uf-card mt-4 overflow-hidden">

            <div className="flex items-center gap-4 border-b border-border p-5">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Leaf
                  size={18}
                />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Afficher le CO₂ économisé
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Afficher l&apos;impact environnemental estimé de chaque trajet.
                </p>

              </div>

              <button
                type="button"
                aria-label="Afficher le CO₂"
                onClick={() =>
                  setShowCO2(
                    (value) =>
                      !value
                  )
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  showCO2
                    ? "bg-primary"
                    : "bg-border"
                }`}
              >

                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    showCO2
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

            <div className="flex items-center gap-4 p-5">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                <Sparkles
                  size={18}
                />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Afficher les FLOWS potentiels
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Afficher les FLOWS pouvant être gagnés avant de choisir un trajet.
                </p>

              </div>

              <button
                type="button"
                aria-label="Afficher les FLOWS"
                onClick={() =>
                  setShowFlows(
                    (value) =>
                      !value
                  )
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  showFlows
                    ? "bg-primary"
                    : "bg-border"
                }`}
              >

                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    showFlows
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

          </div>

        </section>

        {/* Priorité écologique */}
        <section className="mt-8">

          <h2 className="uf-h3 text-secondary">
            Priorité écologique
          </h2>

          <div className="uf-card mt-4 p-5">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Leaf
                  size={19}
                />
              </div>

              <div className="flex-1">

                <p className="uf-label text-secondary">
                  Mettre en avant l&apos;option la plus écologique
                </p>

                <p className="uf-caption mt-1 text-muted">
                  UrbanFlow pourra privilégier l&apos;itinéraire avec l&apos;impact carbone le plus faible parmi les résultats disponibles.
                </p>

              </div>

              <button
                type="button"
                aria-label="Priorité écologique"
                onClick={() =>
                  setEcoPriority(
                    (value) =>
                      !value
                  )
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  ecoPriority
                    ? "bg-primary"
                    : "bg-border"
                }`}
              >

                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    ecoPriority
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

          </div>

        </section>

        {/* Unité */}
        <section className="mt-8">

          <div className="flex items-center gap-2">

            <Ruler
              size={18}
              className="text-primary"
            />

            <h2 className="uf-h3 text-secondary">
              Unité de distance
            </h2>

          </div>

          <div className="uf-card mt-4 grid grid-cols-2 gap-3 p-4">

            <button
              type="button"
              onClick={() =>
                setDistanceUnit(
                  "km"
                )
              }
              className={`rounded-[16px] border p-4 text-center transition ${
                distanceUnit ===
                "km"
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-secondary"
              }`}
            >

              <p className="uf-label">
                Kilomètres
              </p>

              <p className="uf-caption mt-1 text-muted">
                km
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setDistanceUnit(
                  "m"
                )
              }
              className={`rounded-[16px] border p-4 text-center transition ${
                distanceUnit ===
                "m"
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-secondary"
              }`}
            >

              <p className="uf-label">
                Mètres
              </p>

              <p className="uf-caption mt-1 text-muted">
                m
              </p>

            </button>

          </div>

        </section>

        {error && (
          <div className="mt-6 rounded-[16px] bg-error/10 p-4">

            <p className="uf-caption text-error">
              {error}
            </p>

          </div>
        )}

        {success && (
          <div className="mt-6 rounded-[16px] bg-primary-soft p-4">

            <p className="uf-caption font-semibold text-primary">
              {success}
            </p>

          </div>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={
            handleSave
          }
          className="uf-btn-primary mt-8 flex items-center justify-center gap-2 disabled:opacity-60"
        >

          {saving ? (
            <>
              <LoaderCircle
                size={17}
                className="animate-spin"
              />

              Enregistrement...
            </>
          ) : (
            <>
              <Save
                size={17}
              />

              Enregistrer les paramètres
            </>
          )}

        </button>

      </div>

    </main>
  );
}