"use client";

import {
  LocateFixed,
} from "lucide-react";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ConfidentialitePage() {
  const [
    locationEnabled,
    setLocationEnabled,
  ] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        data,
      } =
        await supabase
          .from("profiles")
          .select(
            "location_enabled"
          )
          .eq(
            "id",
            user.id
          )
          .single();

      setLocationEnabled(
        data?.location_enabled ??
          true
      );
    }

    load();
  }, []);

  async function toggleLocation() {
    const next =
      !locationEnabled;

    setLocationEnabled(
      next
    );

    const supabase =
      createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await supabase
      .from("profiles")
      .update({
        location_enabled:
          next,
      })
      .eq(
        "id",
        user.id
      );
  }

  return (
    <main className="min-h-screen bg-background">

      <div className="mx-auto w-full max-w-[430px] px-5 py-7">

        <Link
          href="/profil"
          className="uf-caption font-semibold text-primary"
        >
          ← Retour au profil
        </Link>

        <h1 className="uf-h2 mt-5 text-secondary">
          Confidentialité
        </h1>

        <p className="uf-body mt-2 text-muted">
          Gérez l&apos;utilisation de vos données par UrbanFlow.
        </p>

        <section className="uf-card mt-6 p-5">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
              <LocateFixed
                size={19}
              />
            </div>

            <div className="flex-1">

              <p className="uf-label text-secondary">
                Localisation
              </p>

              <p className="uf-caption mt-1 text-muted">
                Autoriser UrbanFlow à utiliser votre position pour les trajets.
              </p>

            </div>

            <button
              type="button"
              onClick={
                toggleLocation
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                locationEnabled
                  ? "bg-primary"
                  : "bg-border"
              }`}
            >

              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  locationEnabled
                    ? "left-6"
                    : "left-1"
                }`}
              />

            </button>

          </div>

          {!locationEnabled && (
            <div className="mt-4 rounded-[14px] bg-secondary-soft p-3">

              <p className="uf-caption text-secondary">
                La validation géolocalisée des trajets peut être indisponible lorsque cette option est désactivée.
              </p>

            </div>
          )}

        </section>

      </div>

    </main>
  );
}