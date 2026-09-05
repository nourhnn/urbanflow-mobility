"use client";

import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
} from "lucide-react";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Veuillez renseigner votre adresse e-mail."
      );

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const redirectTo =
        `${window.location.origin}/reinitialiser-mot-de-passe`;

      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error) {
      console.error(
        "Erreur mot de passe oublié :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer l'e-mail de réinitialisation."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">

      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-8 pt-7">

        <header>

          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft
              size={17}
            />

            Retour
          </Link>

          <div className="mt-8">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Mail
                size={21}
              />
            </div>

            <h1 className="uf-h2 mt-5 text-secondary">
              Mot de passe oublié
            </h1>

            <p className="uf-body mt-2 text-muted">
              Renseignez l&apos;adresse e-mail associée à votre compte UrbanFlow.
            </p>

          </div>

        </header>

        {!success ? (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8"
          >

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
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="vous@exemple.fr"
                className="uf-input pl-11"
              />

            </div>

            {error && (
              <div className="mt-4 rounded-[16px] bg-error/10 p-4">

                <p className="uf-caption text-error">
                  {error}
                </p>

              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="uf-btn-primary mt-6 flex items-center justify-center gap-2 disabled:opacity-60"
            >

              {loading ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />

                  Envoi...
                </>
              ) : (
                "Envoyer le lien"
              )}

            </button>

          </form>
        ) : (
          <section className="mt-8 rounded-[24px] bg-primary-soft p-5">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircle2
                size={21}
              />
            </div>

            <h2 className="uf-h3 mt-4 text-secondary">
              Vérifiez votre boîte mail
            </h2>

            <p className="uf-body mt-2 text-muted">
              Si un compte UrbanFlow correspond à cette adresse, vous recevrez un lien permettant de choisir un nouveau mot de passe.
            </p>

            <Link
              href="/connexion"
              className="uf-btn-secondary mt-5"
            >
              Retour à la connexion
            </Link>

          </section>
        )}

      </div>

    </main>
  );
}