import Link from "next/link";

import MobilityAnimation from "@/components/ui/MobilityAnimation";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-8 pt-8">

        {/* Logo / identité */}
        <header className="text-center">
          <p className="text-2xl font-bold tracking-tight text-secondary">
            UrbanFlow
          </p>

          <p className="uf-caption mt-1 text-primary">
            Mobility
          </p>
        </header>

        {/* Animation */}
        <section className="mt-8">
          <MobilityAnimation />
        </section>

        {/* Texte principal */}
        <section className="mt-9 text-center">
          <h1 className="uf-h1 text-secondary">
            Bougez mieux.
            <br />
            <span className="text-primary">
              Respirez mieux.
            </span>
          </h1>

          <p className="uf-body-lg mx-auto mt-4 max-w-[340px] text-muted">
            Trouvez vos meilleurs itinéraires,
            réduisez votre impact carbone et
            gagnez des FLOWS à chaque déplacement
            responsable.
          </p>
        </section>

        {/* Boutons */}
        <section className="mt-auto pt-10">
          <div className="space-y-3">

            <Link
              href="/inscription"
              className="uf-btn-primary"
            >
              Créer un compte
            </Link>

            <Link
              href="/connexion"
              className="uf-btn-secondary"
            >
              Se connecter
            </Link>

          </div>

          <p className="uf-caption mt-6 text-center text-subtle">
            En continuant, vous acceptez les conditions
            d&apos;utilisation et la politique de confidentialité
            d&apos;UrbanFlow Mobility.
          </p>
        </section>

      </div>
    </main>
  );
}