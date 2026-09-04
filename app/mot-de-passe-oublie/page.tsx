import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MotDePasseOubliePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[430px] px-6 py-6">

        <Link
          href="/connexion"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-secondary"
        >
          <ArrowLeft size={20} />
        </Link>

        <section className="mt-10">
          <h1 className="uf-h1 text-secondary">
            Mot de passe oublié
          </h1>

          <p className="uf-body-lg mt-3 text-muted">
            La récupération du mot de passe sera disponible lors de
            l&apos;intégration de Supabase.
          </p>
        </section>

      </div>
    </main>
  );
}