"use client";

import Link from "next/link";
import { ArrowLeft, Bike, Bus, Footprints, TrainFront } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  first_name: string | null;
  last_name: string | null;
  preferred_metro: boolean;
  preferred_bus: boolean;
  preferred_bike: boolean;
  preferred_walk: boolean;
};

export default function ModifierProfilPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(`
          first_name,
          last_name,
          preferred_metro,
          preferred_bus,
          preferred_bike,
          preferred_walk
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError("Impossible de charger votre profil.");
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setError("");
    setSaving(true);

    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();

    if (!firstName || !lastName) {
      setError("Le prénom et le nom sont obligatoires.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        preferred_metro: profile.preferred_metro,
        preferred_bus: profile.preferred_bus,
        preferred_bike: profile.preferred_bike,
        preferred_walk: profile.preferred_walk,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Une erreur est survenue pendant la mise à jour.");
      setSaving(false);
      return;
    }

    router.push("/profil");
    router.refresh();
  }

  function togglePreference(
    preference:
      | "preferred_metro"
      | "preferred_bus"
      | "preferred_bike"
      | "preferred_walk"
  ) {
    setProfile((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [preference]: !current[preference],
      };
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[430px] px-6 py-8">
          <p className="uf-body text-muted">
            Chargement du profil...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[430px] px-6 py-8">
          <p className="uf-body text-error">
            Impossible de charger votre profil.
          </p>
        </div>
      </main>
    );
  }

  const preferences = [
    {
      label: "Métro",
      icon: TrainFront,
      key: "preferred_metro" as const,
      active: profile.preferred_metro,
    },
    {
      label: "Bus",
      icon: Bus,
      key: "preferred_bus" as const,
      active: profile.preferred_bus,
    },
    {
      label: "Vélo",
      icon: Bike,
      key: "preferred_bike" as const,
      active: profile.preferred_bike,
    },
    {
      label: "Marche",
      icon: Footprints,
      key: "preferred_walk" as const,
      active: profile.preferred_walk,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[430px] px-6 pb-8 pt-6">

        {/* Header */}
        <header className="relative flex items-center justify-center">
          <Link
            href="/profil"
            aria-label="Retour"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-secondary"
          >
            <ArrowLeft size={20} />
          </Link>

          <h1 className="uf-h3 text-secondary">
            Modifier le profil
          </h1>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-8"
        >

          {/* Infos personnelles */}
          <section>
            <h2 className="uf-h3 text-secondary">
              Informations personnelles
            </h2>

            <div className="mt-4 space-y-5">
              <Input
                id="firstName"
                name="firstName"
                label="Prénom"
                defaultValue={profile.first_name ?? ""}
                autoComplete="given-name"
                required
              />

              <Input
                id="lastName"
                name="lastName"
                label="Nom"
                defaultValue={profile.last_name ?? ""}
                autoComplete="family-name"
                required
              />
            </div>
          </section>

          {/* Préférences */}
          <section>
            <h2 className="uf-h3 text-secondary">
              Préférences de mobilité
            </h2>

            <p className="uf-caption mt-1 text-muted">
              Sélectionnez les modes que vous souhaitez privilégier.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {preferences.map(
                ({ label, icon: Icon, key, active }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePreference(key)}
                    className={`flex items-center gap-3 rounded-[18px] border p-3 text-left transition ${
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
                      <Icon size={17} />
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
                        {active ? "Activé" : "Désactivé"}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          </section>

          {/* Erreur */}
          {error && (
            <div className="rounded-[14px] bg-error/10 px-4 py-3">
              <p className="uf-body text-error">
                {error}
              </p>
            </div>
          )}

          {/* Sauvegarde */}
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>

        </form>

      </div>
    </main>
  );
}