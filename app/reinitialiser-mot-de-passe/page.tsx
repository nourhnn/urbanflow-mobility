"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

export default function ReinitialiserMotDePassePage() {
  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

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

    if (
      password.length < 6
    ) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Les deux mots de passe ne correspondent pas."
      );

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error) {
      console.error(
        "Erreur nouveau mot de passe :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier votre mot de passe."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background">

        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center px-5">

          <section className="w-full rounded-[24px] bg-primary-soft p-6">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircle2
                size={21}
              />
            </div>

            <h1 className="uf-h2 mt-5 text-secondary">
              Mot de passe modifié
            </h1>

            <p className="uf-body mt-2 text-muted">
              Votre nouveau mot de passe a bien été enregistré.
            </p>

            <Link
              href="/connexion"
              className="uf-btn-primary mt-6"
            >
              Se connecter
            </Link>

          </section>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">

      <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-10">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <LockKeyhole
            size={21}
          />
        </div>

        <h1 className="uf-h2 mt-5 text-secondary">
          Nouveau mot de passe
        </h1>

        <p className="uf-body mt-2 text-muted">
          Choisissez un nouveau mot de passe pour votre compte UrbanFlow.
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >

          <div>

            <label
              htmlFor="password"
              className="uf-label text-secondary"
            >
              Nouveau mot de passe
            </label>

            <div className="relative mt-2">

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                className="uf-input pr-12"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              >
                {showPassword ? (
                  <EyeOff
                    size={18}
                  />
                ) : (
                  <Eye
                    size={18}
                  />
                )}
              </button>

            </div>

          </div>

          <div>

            <label
              htmlFor="confirmPassword"
              className="uf-label text-secondary"
            >
              Confirmer le mot de passe
            </label>

            <div className="relative mt-2">

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                className="uf-input pr-12"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) =>
                      !value
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              >
                {showConfirmPassword ? (
                  <EyeOff
                    size={18}
                  />
                ) : (
                  <Eye
                    size={18}
                  />
                )}
              </button>

            </div>

          </div>

          {error && (
            <div className="rounded-[16px] bg-error/10 p-4">

              <p className="uf-caption text-error">
                {error}
              </p>

            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="uf-btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
          >

            {loading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />

                Modification...
              </>
            ) : (
              "Modifier le mot de passe"
            )}

          </button>

        </form>

      </div>

    </main>
  );
}