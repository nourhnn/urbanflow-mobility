import {
    CircleHelp,
    Leaf,
    MapPin,
    Sparkles,
  } from "lucide-react";
  
  import Link from "next/link";
  
  const questions = [
    {
      question:
        "Comment fonctionne UrbanFlow ?",
      answer:
        "UrbanFlow vous permet de comparer plusieurs modes de transport, de choisir un itinéraire et de suivre l’impact environnemental de vos déplacements.",
    },
    {
      question:
        "Comment gagner des FLOWS ?",
      answer:
        "Les FLOWS sont attribués après la validation d’un trajet responsable. Leur quantité dépend du CO₂ économisé par rapport à un trajet équivalent en voiture.",
    },
    {
      question:
        "Pourquoi UrbanFlow utilise ma localisation ?",
      answer:
        "La localisation permet de déterminer votre position de départ et de vérifier votre arrivée à destination lors de la validation d’un trajet.",
    },
    {
      question:
        "Puis-je désactiver la localisation ?",
      answer:
        "Oui. Vous pouvez la désactiver depuis la rubrique Confidentialité. Certaines fonctions liées aux trajets ne seront alors plus disponibles.",
    },
  ];
  
  export default function AidePage() {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-[430px] px-5 py-7">
  
          <Link
            href="/profil"
            className="uf-caption font-semibold text-primary"
          >
            ← Retour au profil
          </Link>
  
          <header className="mt-5">
  
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <CircleHelp size={21} />
            </div>
  
            <h1 className="uf-h2 mt-4 text-secondary">
              Aide et support
            </h1>
  
            <p className="uf-body mt-2 text-muted">
              Retrouvez les réponses aux principales questions sur UrbanFlow.
            </p>
  
          </header>
  
          <section className="mt-7 space-y-3">
  
            {questions.map(
              ({
                question,
                answer,
              }) => (
                <article
                  key={question}
                  className="uf-card p-5"
                >
  
                  <p className="uf-label text-secondary">
                    {question}
                  </p>
  
                  <p className="uf-body mt-2 text-muted">
                    {answer}
                  </p>
  
                </article>
              )
            )}
  
          </section>
  
          <section className="mt-8">
  
            <h2 className="uf-h3 text-secondary">
              À propos d&apos;UrbanFlow
            </h2>
  
            <div className="uf-card mt-4 space-y-4 p-5">
  
              <div className="flex items-center gap-3">
  
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MapPin size={17} />
                </div>
  
                <div>
                  <p className="uf-label text-secondary">
                    Mobilité
                  </p>
  
                  <p className="uf-caption mt-1 text-muted">
                    Comparer simplement vos déplacements.
                  </p>
                </div>
  
              </div>
  
              <div className="flex items-center gap-3">
  
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Leaf size={17} />
                </div>
  
                <div>
                  <p className="uf-label text-secondary">
                    Impact
                  </p>
  
                  <p className="uf-caption mt-1 text-muted">
                    Visualiser le CO₂ économisé.
                  </p>
                </div>
  
              </div>
  
              <div className="flex items-center gap-3">
  
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                  <Sparkles size={17} />
                </div>
  
                <div>
                  <p className="uf-label text-secondary">
                    Flow Rewards
                  </p>
  
                  <p className="uf-caption mt-1 text-muted">
                    Valoriser les déplacements responsables.
                  </p>
                </div>
  
              </div>
  
            </div>
  
          </section>
  
          <p className="uf-caption mt-8 text-center text-subtle">
            UrbanFlow Mobility • Version 1.0
          </p>
  
        </div>
      </main>
    );
  }