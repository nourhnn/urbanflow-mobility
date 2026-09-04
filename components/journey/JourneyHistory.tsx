import {
    Bike,
    Bus,
    Car,
    CheckCircle2,
    Clock,
    Footprints,
    Leaf,
    MapPin,
    Route,
    Sparkles,
    TrainFront,
    TramFront,
  } from "lucide-react";
  
  import { createClient } from "@/lib/supabase/server";
  
  type Journey = {
    id: string;
    status:
      | "planned"
      | "started"
      | "completed"
      | "rewarded"
      | "cancelled";
  
    transport_mode: string;
  
    origin_name: string | null;
    destination_name: string | null;
  
    estimated_duration_seconds: number;
    distance_meters: number | null;
  
    co2_saved: number | string;
    flows_earned: number;
  
    started_at: string | null;
    completed_at: string | null;
    rewarded_at: string | null;
    created_at: string;
  };
  
  function formatDuration(seconds: number) {
    const minutes = Math.round(seconds / 60);
  
    if (minutes < 60) {
      return `${minutes} min`;
    }
  
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
  
    if (remainingMinutes === 0) {
      return `${hours} h`;
    }
  
    return `${hours} h ${remainingMinutes} min`;
  }
  
  function formatDistance(meters: number | null) {
    if (!meters) {
      return "—";
    }
  
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
  
    return `${(meters / 1000).toFixed(1)} km`;
  }
  
  function formatCO2(value: number | string) {
    const kg = Number(value);
  
    if (!Number.isFinite(kg)) {
      return "0 g";
    }
  
    if (kg < 1) {
      return `${Math.round(kg * 1000)} g`;
    }
  
    return `${kg.toFixed(2)} kg`;
  }
  
  function formatDate(value: string) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }
  
  function getStatusPresentation(journey: Journey) {
    switch (journey.status) {
      case "rewarded":
        return {
          label: "Validé",
          className:
            "bg-primary-soft text-primary",
        };
  
      case "completed":
        return {
          label: "Terminé",
          className:
            "bg-secondary-soft text-secondary",
        };
  
      case "started":
        return {
          label: "En cours",
          className:
            "bg-accent-soft text-accent",
        };
  
      case "planned":
        return {
          label: "Planifié",
          className:
            "bg-background text-muted",
        };
  
      case "cancelled":
        return {
          label: "Annulé",
          className:
            "bg-error/10 text-error",
        };
    }
  }
  
  function getModePresentation(transportMode: string) {
    const normalized = transportMode.toLowerCase();
  
    if (normalized === "walking") {
      return {
        label: "Marche",
        icon: Footprints,
      };
    }
  
    if (normalized === "cycling") {
      return {
        label: "Vélo",
        icon: Bike,
      };
    }
  
    if (normalized === "driving") {
      return {
        label: "Voiture",
        icon: Car,
      };
    }
  
    const modes = normalized.split(",");
  
    if (modes.length > 1) {
      return {
        label: "Multimodal",
        icon: Route,
      };
    }
  
    if (normalized.includes("metro")) {
      return {
        label: "Métro",
        icon: TrainFront,
      };
    }
  
    if (normalized.includes("tram")) {
      return {
        label: "Tram",
        icon: TramFront,
      };
    }
  
    if (
      normalized.includes("train") ||
      normalized.includes("rer")
    ) {
      return {
        label: "Train / RER",
        icon: TrainFront,
      };
    }
  
    if (
      normalized.includes("bus") ||
      normalized === "transit"
    ) {
      return {
        label: "Transports",
        icon: Bus,
      };
    }
  
    return {
      label: "Trajet",
      icon: MapPin,
    };
  }
  
  export default async function JourneyHistory() {
    const supabase = await createClient();
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return null;
    }
  
    const {
      data,
      error,
    } = await supabase
      .from("journeys")
      .select(`
        id,
        status,
        transport_mode,
        origin_name,
        destination_name,
        estimated_duration_seconds,
        distance_meters,
        co2_saved,
        flows_earned,
        started_at,
        completed_at,
        rewarded_at,
        created_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(10);
  
    if (error) {
      console.error(
        "Erreur chargement historique :",
        error
      );
  
      return (
        <section className="mt-10">
          <h2 className="uf-h3 text-secondary">
            Mes trajets récents
          </h2>
  
          <div className="mt-4 rounded-[18px] bg-error/10 p-4">
            <p className="uf-body text-error">
              Impossible de charger votre historique.
            </p>
          </div>
        </section>
      );
    }
  
    const journeys = (data ?? []) as Journey[];
  
    return (
      <section className="mt-10">
  
        <div>
          <h2 className="uf-h3 text-secondary">
            Mes trajets récents
          </h2>
  
          <p className="uf-caption mt-1 text-muted">
            Retrouvez vos derniers déplacements UrbanFlow
          </p>
        </div>
  
        {journeys.length === 0 ? (
          <div className="uf-card mt-4 p-6 text-center">
  
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Route size={21} />
            </div>
  
            <p className="uf-label mt-4 text-secondary">
              Aucun trajet pour le moment
            </p>
  
            <p className="uf-caption mx-auto mt-2 max-w-[260px] text-muted">
              Vos trajets apparaîtront ici après leur planification.
            </p>
  
          </div>
        ) : (
          <div className="mt-4 space-y-3">
  
            {journeys.map((journey) => {
              const mode =
                getModePresentation(
                  journey.transport_mode
                );
  
              const status =
                getStatusPresentation(
                  journey
                );
  
              const Icon = mode.icon;
  
              const date =
                journey.completed_at ??
                journey.started_at ??
                journey.created_at;
  
              return (
                <article
                  key={journey.id}
                  className="uf-card overflow-hidden"
                >
  
                  <div className="p-4">
  
                    <div className="flex items-start gap-3">
  
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon size={19} />
                      </div>
  
                      <div className="min-w-0 flex-1">
  
                        <div className="flex items-start justify-between gap-3">
  
                          <div>
                            <p className="uf-label text-secondary">
                              {mode.label}
                            </p>
  
                            <p className="uf-caption mt-1 text-muted">
                              {formatDate(date)}
                            </p>
                          </div>
  
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
  
                        </div>
  
                      </div>
  
                    </div>
  
                    <div className="mt-4 flex gap-3">
  
                      <div className="flex flex-col items-center pt-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="my-1 h-5 w-px bg-border" />
                        <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                      </div>
  
                      <div className="min-w-0 flex-1">
  
                        <p className="uf-caption truncate text-secondary">
                          {journey.origin_name ??
                            "Point de départ"}
                        </p>
  
                        <p className="uf-caption mt-4 truncate text-secondary">
                          {journey.destination_name ??
                            "Destination"}
                        </p>
  
                      </div>
  
                    </div>
  
                    <div className="mt-4 grid grid-cols-2 gap-2">
  
                      <div className="rounded-[14px] bg-background p-3">
                        <div className="flex items-center gap-1.5 text-muted">
                          <Clock size={13} />
  
                          <span className="uf-caption">
                            Durée
                          </span>
                        </div>
  
                        <p className="uf-label mt-1 text-secondary">
                          {formatDuration(
                            journey.estimated_duration_seconds
                          )}
                        </p>
                      </div>
  
                      <div className="rounded-[14px] bg-background p-3">
                        <div className="flex items-center gap-1.5 text-muted">
                          <Route size={13} />
  
                          <span className="uf-caption">
                            Distance
                          </span>
                        </div>
  
                        <p className="uf-label mt-1 text-secondary">
                          {formatDistance(
                            journey.distance_meters
                          )}
                        </p>
                      </div>
  
                    </div>
  
                    {journey.status === "rewarded" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
  
                        <div className="rounded-[14px] bg-primary-soft p-3">
                          <div className="flex items-center gap-1.5 text-primary">
                            <Leaf size={13} />
  
                            <span className="uf-caption">
                              CO₂ économisé
                            </span>
                          </div>
  
                          <p className="uf-label mt-1 text-primary">
                            {formatCO2(
                              journey.co2_saved
                            )}
                          </p>
                        </div>
  
                        <div className="rounded-[14px] bg-secondary-soft p-3">
                          <div className="flex items-center gap-1.5 text-secondary">
                            <Sparkles size={13} />
  
                            <span className="uf-caption">
                              FLOWS
                            </span>
                          </div>
  
                          <p className="uf-label mt-1 text-secondary">
                            +{journey.flows_earned}
                          </p>
                        </div>
  
                      </div>
                    )}
  
                    {journey.status === "rewarded" && (
                      <div className="mt-3 flex items-center gap-2 text-primary">
                        <CheckCircle2 size={14} />
  
                        <p className="uf-caption font-semibold">
                          Trajet validé et récompensé
                        </p>
                      </div>
                    )}
  
                  </div>
  
                </article>
              );
            })}
  
          </div>
        )}
  
      </section>
    );
  }