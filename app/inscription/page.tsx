"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? ""
    );

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setSuccess(
        "Compte créé ! Vérifiez votre adresse e-mail pour confirmer votre inscription."
      );
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
        <section className="mt-10">
          <p className="uf-caption mb-2 font-semibold uppercase tracking-[0.12em] text-primary">
            Rejoignez UrbanFlow
          </p>

          <h1 className="uf-h1 text-secondary">
            Créer un compte
          </h1>

          <p className="uf-body-lg mt-3 text-muted">
            Commencez à optimiser vos trajets et soyez récompensé pour vos
            déplacements responsables.
          </p>
        </section>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="firstName"
              name="firstName"
              label="Prénom"
              placeholder="Prénom"
              autoComplete="given-name"
              required
            />

            <Input
              id="lastName"
              name="lastName"
              label="Nom"
              placeholder="Nom"
              autoComplete="family-name"
              required
            />
          </div>

          <Input
            id="email"
            name="email"
            type="email"
            label="Adresse e-mail"
            placeholder="vous@exemple.com"
            autoComplete="email"
            required
          />

          <PasswordInput
            id="password"
            name="password"
            label="Mot de passe"
            placeholder="8 caractères minimum"
            autoComplete="new-password"
          />

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            autoComplete="new-password"
          />

          <p className="uf-caption -mt-2 text-subtle">
            Utilisez au minimum 8 caractères.
          </p>

          <Checkbox
            id="terms"
            name="terms"
            required
            label={
              <>
                J&apos;accepte les{" "}
                <span className="font-semibold text-primary">
                  conditions d&apos;utilisation
                </span>{" "}
                et la politique de confidentialité.
              </>
            }
          />

          {error && (
            <div className="rounded-[14px] bg-error/10 px-4 py-3">
              <p className="uf-body text-error">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="rounded-[14px] bg-primary-soft px-4 py-3">
              <p className="uf-body text-primary">
                {success}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </div>
        </form>

        {/* Lien connexion */}
        <div className="mt-7 text-center">
          <p className="uf-body text-muted">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="font-semibold text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>

      </div>
    </main>
  )