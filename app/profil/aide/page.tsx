"use client";

import {
  ChevronDown,
  CircleHelp,
  Mail,
  MessageCircleMore,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const faqItems = [
  {
    question: "Comment sont calculés les FLOWS ?",
    answer:
      "Les FLOWS sont attribués après validation d’un trajet responsable. Leur calcul dépend principalement du CO₂ économisé par rapport à un trajet de référence en voiture thermique.",
  },
  {
    question: "Pourquoi mon trajet n’a-t-il pas été validé ?",
    answer:
      "UrbanFlow vérifie notamment que le trajet a bien été démarré et que vous êtes suffisamment proche de votre destination au moment de le terminer.",
  },
  {
    question: "Comment modifier mes préférences de mobilité ?",
    answer:
      "Rendez-vous dans Profil, puis Informations personnelles. Vous pouvez y modifier vos préférences de transport ainsi que vos lieux enregistrés.",
  },
  {
    question: "Comment fonctionne l’impact CO₂ ?",
    answer:
      "UrbanFlow compare les émissions estimées de votre trajet avec celles d’un trajet équivalent en voiture thermique. La différence correspond au CO₂ économisé.",
  },
  {
    question: "Puis-je modifier mon adresse e-mail ?",
    answer:
      "Oui. Rendez-vous dans Informations personnelles. Selon la configuration de votre compte, une confirmation par e-mail peut être demandée.",
  },
];

export default function AidePage() {
  const [openIndex, setOpenIndex] =
    useState<number | null>(null);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[430px] px-5 pb-12 pt-7">
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
            Retrouvez les réponses aux questions fréquentes ou contactez-nous si vous avez besoin d’aide.
          </p>
        </header>

        <section className="mt-8">
          <h2 className="uf-h3 text-secondary">
            Nous contacter
          </h2>

          <div className="uf-card mt-4 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Mail size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="uf-label text-secondary">
                  Support UrbanFlow
                </p>

                <p className="uf-caption mt-2 text-muted">
                  Une question, un problème avec un trajet ou une suggestion d’amélioration ?
                </p>

                <a
                  href="mailto:support@urbanflow-mobility.fr"
                  className="uf-btn-primary mt-4 flex items-center justify-center gap-2"
                >
                  <MessageCircleMore size={17} />
                  Contacter le support
                </a>

                <p className="uf-caption mt-3 break-all text-muted">
                  support@urbanflow-mobility.fr
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="uf-h3 text-secondary">
            Questions fréquentes
          </h2>

          <div className="mt-4 space-y-3">
            {faqItems.map((item, index) => {
              const isOpen =
                openIndex === index;

              return (
                <div
                  key={item.question}
                  className="uf-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIndex(
                        isOpen
                          ? null
                          : index
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="uf-label text-secondary">
                      {item.question}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-muted transition-transform ${
                        isOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      <p className="uf-body text-muted">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
