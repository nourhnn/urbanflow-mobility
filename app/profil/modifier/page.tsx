"use client";

import {
  Bike,
  Bus,
  Footprints,
  LoaderCircle,
  Mail,
  MapPin,
  Save,
  TrainFront,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ModifierProfilPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");

  const [homeAddress, setHomeAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");

  const [preferredMetro, setPreferredMetro] = useState(true);
  const [preferredBus, setPreferredBus] = useState(true);
  const [preferredBike, setPreferredBike] = useState(true);
  const [preferredWalk, setPreferredWalk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Utilisateur non authentifié.");
        setLoading(false);
        return;
      }

      const currentEmail = user.email ?? "";

      setEmail(currentEmail);
      setOriginalEmail(currentEmail);

      const { data, error } = await supabase
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
        console.error("Erreur chargement profil :", error);

        setError("Impossible de charger votre profil.");
        setLoading(false);
        return;
      }

      setFirstName(
        data?.first_name ??
          user.user_metadata?.first_name ??
          ""
      );

      setLastName(
        data?.last_name ??
          user.user_metadata?.last_name ??
          ""
      );

      setPreferredMetro(data?.preferred_metro ?? true);
      setPreferredBus(data?.preferred_bus ?? true);
      setPreferredBike(data?.preferred_bike ?? true);
      setPreferredWalk(data?.preferred_walk ?? false);

      setHomeAddress(data?.home_address ?? "");
      setWorkAddress(data?.work_address ?? "");

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Utilisateur non authentifié.");
      }

      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanFirstName || !cleanLastName) {
        throw new Error("Le prénom et le nom sont obligatoires.");
      }

      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Veuillez renseigner une adresse e-mail valide.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          preferred_metro: preferredMetro,
          preferred_bus: preferredBus,
          preferred_bike: preferredBike,
          preferred_walk: preferredWalk,
          home_address: homeAddress.trim() || null,
          work_address: workAddress.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
          },
        });

      if (metadataError) {
        throw metadataError;
      }

      if (cleanEmail !== originalEmail.toLowerCase()) {
        const { error: emailError } =
          await supabase.auth.updateUser({
            email: cleanEmail,
          });

        if (emailError) {
          throw emailError;
        }

        setOriginalEmail(cleanEmail);

        setSuccess(
          "Vos informations ont été enregistrées. Un e-mail de confirmation peut être nécessaire pour valider votre nouvelle adresse."
        );

        return;
      }

      setSuccess("Vos informations ont été enregistrées.");
    } catch (error) {
      console.error("Erreur modification profil :", error);

      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer vos informations."
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
        <Link
          href="/profil"
          className="uf-caption font-semibold text-primary"
        >
          ← Retour au profil
        </Link>

        <header className="mt-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <UserRound size={21} />
          </div>

          <h1 className="uf-h2 mt-4 text-secondary">
            Informations personnelles
          </h1>

          <p className="uf-body mt-2 text-muted">
            Modifiez vos informations et vos préférences de mobilité.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="uf-h3 text-secondary">
            Identité
          </h2>

          <div className="uf-card mt-4 space-y-5 p-5">
            <div>
              <label
                htmlFor="firstName"
                className="uf-label text-secondary"
              >
                Prénom
              </label>

              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
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
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                className="uf-input mt-2"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="uf-label text-secondary"
              >
                Adresse e-mail
              </label>

              <div className="relative mt-2">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  className="uf-input pl-11"
                />
              </div>

              <p className="uf-caption mt-2 text-muted">
                Si vous changez d&apos;adresse e-mail, une confirmation peut être nécessaire.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <MapPin
              size={18}
              className="text-primary"
            />

            <h2 className="uf-h3 text-secondary">
              Lieux enregistrés
            </h2>
          </div>

          <div className="uf-card mt-4 space-y-5 p-5">
            <div>
              <label
                htmlFor="homeAddress"
                className="uf-label text-secondary"
              >
                Maison
              </label>

              <input
                id="homeAddress"
                type="text"
                value={homeAddress}
                onChange={(event) =>
                  setHomeAddress(event.target.value)
                }
                placeholder="Votre adresse personnelle"
                className="uf-input mt-2"
              />
            </div>

            <div>
              <label
                htmlFor="workAddress"
                className="uf-label text-secondary"
              >
                Travail
              </label>

              <input
                id="workAddress"
                type="text"
                value={workAddress}
                onChange={(event) =>
                  setWorkAddress(event.target.value)
                }
                placeholder="Votre adresse professionnelle"
                className="uf-input mt-2"
              />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="uf-h3 text-secondary">
            Préférences de mobilité
          </h2>

          <p className="uf-caption mt-1 text-muted">
            Sélectionnez les modes de transport que vous utilisez le plus souvent.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <PreferenceButton
              label="Métro / Train"
              icon={TrainFront}
              enabled={preferredMetro}
              onClick={() =>
                setPreferredMetro((value) => !value)
              }
            />

            <PreferenceButton
              label="Bus"
              icon={Bus}
              enabled={preferredBus}
              onClick={() =>
                setPreferredBus((value) => !value)
              }
            />

            <PreferenceButton
              label="Vélo"
              icon={Bike}
              enabled={preferredBike}
              onClick={() =>
                setPreferredBike((value) => !value)
              }
            />

            <PreferenceButton
              label="Marche"
              icon={Footprints}
              enabled={preferredWalk}
              onClick={() =>
                setPreferredWalk((value) => !value)
              }
            />
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
          onClick={handleSave}
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
              <Save size={17} />
              Enregistrer
            </>
          )}
        </button>
      </div>
    </main>
  );
}

type PreferenceButtonProps = {
  label: string;
  icon: typeof TrainFront;
  enabled: boolean;
  onClick: () => void;
};

function PreferenceButton({
  label,
  icon: Icon,
  enabled,
  onClick,
}: PreferenceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition ${
        enabled
          ? "border-primary bg-primary-soft"
          : "border-border bg-surface"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          enabled
            ? "bg-primary text-white"
            : "bg-background text-muted"
        }`}
      >
        <Icon size={18} />
      </div>

      <div>
        <p
          className={`uf-label ${
            enabled
              ? "text-primary"
              : "text-secondary"
          }`}
        >
          {label}
        </p>

        <p className="uf-caption mt-1 text-muted">
          {enabled ? "Activé" : "Désactivé"}
        </p>
      </div>
    </button>
  );
}
