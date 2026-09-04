"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";

export default function ConnexionPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError("Adresse e-mail ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/accueil");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-8 pt-6">

        {/* Header */}
        <header className="relative flex items-center justify-center">
          <Link
            href="/"
            aria-label="Retour"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-secondary transition-colors hover:bg-secondary-soft"
          >
            <ArrowLeft size={20} />
          </Link>

          <Image
            src="/logo/urbanflow-logo.png"
            alt="UrbanFlow Mobility"
            width={170}
            height={60}
            priority
            className="h-auto w-[150px]"
          />
        </header>

        {/* Intro */}
        <section className="mt-12">
          <p className="uf-caption mb-2 font-semibold uppercase tracking-[0.12em] text-primary">
            Bon retour
          </p>

          <h1 className="uf-h1 text-secondary">
            Connectez-vous
          </h1>

          <p className="uf-body-lg mt-3 text-muted">
            Retrouvez vos trajets, vos statistiques et vos FLOWS.
          </p>
        </section>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-5"
        >
          <Input
            id="email"
            name="email"
            type="email"
            label="Adresse e-mail"
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />

          <div>
            <PasswordInput
              id="password"
              name="password"
              label="Mot de passe"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
            />

            <div className="mt-3 flex justify-end">
              <Link
                href="/mot-de-passe-oublie"
                className="uf-caption font-semibold text-primary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-[14px] bg-error/10 px-4 py-3">
              <p className="uf-body text-error">
                {error}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </div>
        </form>

        {/* Séparateur */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />

          <span className="uf-caption text-subtle">
            Nouveau sur UrbanFlow ?
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          href="/inscription"
          variant="secondary"
        >
          Créer un compte
        </Button>

      </div>
    </main>
  );
}