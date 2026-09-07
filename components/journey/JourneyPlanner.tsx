"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Bike,
  Bus,
  Car,
  Check,
  Clock3,
  Footprints,
  Leaf,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  TrainFront,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  JourneyCoordinates,
  JourneyPoint,
  MapboxJourneyData,
  MapboxTravelMode,
} from "@/components/map/UrbanFlowMap";

import {
  calculateCO2,
  type CO2Segment,
} from "@/lib/co2/calculateCO2";

import { canUseLocation } from "@/lib/privacy/location";
import { createClient } from "@/lib/supabase/client";

const UrbanFlowMap = dynamic(
  () =>
    import(
      "@/components/map/UrbanFlowMap"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="uf-card mt-5 flex h-[330px] items-center justify-center">
        <LoaderCircle
          size={22}
          className="animate-spin text-primary"
        />
      </div>
    ),
  }
);

type TransportMode =
  | "walking"
  | "cycling"
  | "driving"
  | "transit";

type OriginMode =
  | "current"
  | "custom";

type JourneyStatus =
  | "idle"
  | "planned"
  | "started";

type TransitModeFilter =
  | "all"
  | "metro"
  | "bus"
  | "tram"
  | "train";

type TransitSection = {
  type?: string;
  mode?: string;
  physicalMode?: string;
  commercialMode?: string;
  line?: string;
  lineName?: string;
  direction?: string;
  duration?: number;
  distanceMeters?: number;
  from?: string;
  to?: string;
};

type TransitJourney = {
  id?: string;
  duration: number;
  departureDateTime?: string;
  arrivalDateTime?: string;
  transfers?: number;
  walkingDuration?: number;
  distanceMeters?: number;
  sections?: TransitSection[];
};

type SelectedJourney = {
  type:
    | "mapbox"
    | "transit";

  mode:
    TransportMode;

  duration:
    number;

  distance:
    number;

  origin:
    [number, number];

  destination:
    [number, number];

  originName:
    string;

  destinationName:
    string;

  co2Segments:
    CO2Segment[];

  tripCO2Kg:
    number;

  referenceCarCO2Kg:
    number;

  co2SavedKg:
    number;

  flowsPotential:
    number;

  transitJourney?:
    TransitJourney;
};

type ProfileSettings = {
  default_transport_mode:
    | TransportMode
    | null;

  show_co2:
    boolean;

  show_flows:
    boolean;

  eco_priority:
    boolean;

  distance_unit:
    "km"
    | "m";
};

const transportModes: {
  id: TransportMode;
  label: string;
  icon: typeof Footprints;
}[] = [
  {
    id: "walking",
    label: "Marche",
    icon: Footprints,
  },
  {
    id: "cycling",
    label: "Vélo",
    icon: Bike,
  },
  {
    id: "driving",
    label: "Voiture",
    icon: Car,
  },
  {
    id: "transit",
    label: "Transports",
    icon: TrainFront,
  },
];

const transitFilters: {
  id: TransitModeFilter;
  label: string;
}[] = [
  {
    id: "all",
    label: "Tous",
  },
  {
    id: "metro",
    label: "Métro",
  },
  {
    id: "bus",
    label: "Bus",
  },
  {
    id: "tram",
    label: "Tram",
  },
  {
    id: "train",
    label: "Train",
  },
];

function formatDuration(
  seconds: number
) {
  const minutes =
    Math.max(
      1,
      Math.round(
        seconds / 60
      )
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainingMinutes =
    minutes % 60;

  if (
    remainingMinutes === 0
  ) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

function formatDistance(
  meters: number,
  unit: "km" | "m"
) {
  if (
    unit === "m"
  ) {
    return `${Math.round(
      meters
    )} m`;
  }

  if (
    meters < 1000
  ) {
    return `${Math.round(
      meters
    )} m`;
  }

  return `${(
    meters /
    1000
  ).toFixed(1)} km`;
}

function formatTransitTime(
  value?: string
) {
  if (!value) {
    return "";
  }

  /*
   * Format Navitia :
   * YYYYMMDDTHHMMSS
   */
  const match =
    value.match(
      /^\d{8}T(\d{2})(\d{2})/
    );

  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  const date =
    new Date(value);

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return date.toLocaleTimeString(
      "fr-FR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  return value;
}

function getTransitEmissionMode(
  section: TransitSection
):
  | "walking"
  | "metro"
  | "bus"
  | "tram"
  | "train" {
  const text =
    [
      section.mode,
      section.physicalMode,
      section.commercialMode,
      section.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  if (
    text.includes("walk")
  ) {
    return "walking";
  }

  if (
    text.includes("tram")
  ) {
    return "tram";
  }

  if (
    text.includes("bus")
  ) {
    return "bus";
  }

  if (
    text.includes("metro") ||
    text.includes("subway")
  ) {
    return "metro";
  }

  return "train";
}

function buildTransitCO2Segments(
  journey: TransitJourney
): CO2Segment[] {
  return (
    journey.sections ??
    []
  )
    .map(
      (
        section
      ): CO2Segment => ({
        mode:
          getTransitEmissionMode(
            section
          ),

        distanceMeters:
          Number(
            section.distanceMeters ??
              0
          ),
      })
    )
    .filter(
      (segment) =>
        Number.isFinite(
          segment.distanceMeters
        ) &&
        segment.distanceMeters >
          0
    );
}

function getSectionIcon(
  section: TransitSection
) {
  const mode =
    getTransitEmissionMode(
      section
    );

  if (
    mode === "walking"
  ) {
    return Footprints;
  }

  if (
    mode === "bus"
  ) {
    return Bus;
  }

  return TrainFront;
}

function getSectionLabel(
  section: TransitSection
) {
  const mode =
    getTransitEmissionMode(
      section
    );

  if (
    mode === "walking"
  ) {
    return "Marche";
  }

  if (
    section.lineName
  ) {
    return section.lineName;
  }

  if (
    section.line
  ) {
    return section.line;
  }

  if (
    mode === "bus"
  ) {
    return "Bus";
  }

  if (
    mode === "tram"
  ) {
    return "Tram";
  }

  if (
    mode === "metro"
  ) {
    return "Métro";
  }

  return "Train";
}

export default function JourneyPlanner() {
  const searchParams =
    useSearchParams();

  const savedDestination =
    searchParams.get(
      "destination"
    );

  const [
    mode,
    setMode,
  ] =
    useState<TransportMode>(
      "walking"
    );

  const [
    originMode,
    setOriginMode,
  ] =
    useState<OriginMode>(
      "current"
    );

  const [
    coordinates,
    setCoordinates,
  ] =
    useState<JourneyCoordinates>({
      origin: null,
      destination: null,
    });

  const [
    originPoint,
    setOriginPoint,
  ] =
    useState<JourneyPoint | null>(
      null
    );

  const [
    destinationPoint,
    setDestinationPoint,
  ] =
    useState<JourneyPoint | null>(
      null
    );

  const [
    mapboxJourney,
    setMapboxJourney,
  ] =
    useState<MapboxJourneyData | null>(
      null
    );

  const [
    transitJourneys,
    setTransitJourneys,
  ] =
    useState<TransitJourney[]>(
      []
    );

  const [
    transitFilter,
    setTransitFilter,
  ] =
    useState<TransitModeFilter>(
      "all"
    );

  const [
    selectedJourney,
    setSelectedJourney,
  ] =
    useState<SelectedJourney | null>(
      null
    );

  const [
    selectedJourneyId,
    setSelectedJourneyId,
  ] =
    useState<string | null>(
      null
    );

  const [
    journeyStatus,
    setJourneyStatus,
  ] =
    useState<JourneyStatus>(
      "idle"
    );

  const [
    loadingTransit,
    setLoadingTransit,
  ] =
    useState(false);

  const [
    selectingJourney,
    setSelectingJourney,
  ] =
    useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    settings,
    setSettings,
  ] =
    useState<ProfileSettings>({
      default_transport_mode:
        "walking",

      show_co2:
        true,

      show_flows:
        true,

      eco_priority:
        false,

      distance_unit:
        "km",
    });

  /*
   * Chargement des paramètres utilisateur
   */
  useEffect(() => {
    async function loadSettings() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        data,
      } =
        await supabase
          .from("profiles")
          .select(`
            default_transport_mode,
            show_co2,
            show_flows,
            eco_priority,
            distance_unit
          `)
          .eq(
            "id",
            user.id
          )
          .single();

      if (!data) {
        return;
      }

      const nextSettings: ProfileSettings =
        {
          default_transport_mode:
            data.default_transport_mode ??
            "walking",

          show_co2:
            data.show_co2 ??
            true,

          show_flows:
            data.show_flows ??
            true,

          eco_priority:
            data.eco_priority ??
            false,

          distance_unit:
            data.distance_unit ??
            "km",
        };

      setSettings(
        nextSettings
      );

      if (
        nextSettings.default_transport_mode
      ) {
        setMode(
          nextSettings.default_transport_mode
        );
      }
    }

    loadSettings();
  }, []);

  /*
   * Destination venant des lieux enregistrés.
   */
  useEffect(() => {
    if (
      !savedDestination
    ) {
      return;
    }

    const token =
      process.env
        .NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      return;
    }

    async function loadSavedDestination() {
      try {
        const response =
          await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              savedDestination!
            )}.json?access_token=${token}&limit=1&language=fr`
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        const feature =
          data?.features?.[0];

        if (
          !feature ||
          !Array.isArray(
            feature.center
          )
        ) {
          return;
        }

        const point: JourneyPoint =
          {
            name:
              feature.place_name ??
              savedDestination!,

            coordinates: [
              Number(
                feature.center[0]
              ),
              Number(
                feature.center[1]
              ),
            ],
          };

        setOriginMode(
          "current"
        );

        setDestinationPoint(
          point
        );

        setCoordinates(
          (
            previous
          ) => ({
            ...previous,
            destination:
              point.coordinates,
          })
        );
      } catch (
        error
      ) {
        console.error(
          "Erreur destination enregistrée :",
          error
        );
      }
    }

    loadSavedDestination();
  }, [
    savedDestination,
  ]);

  /*
   * Calcul du trajet Mapbox.
   */
  const mapboxOption =
    useMemo(
      () => {
        if (
          !mapboxJourney
        ) {
          return null;
        }

        const emissionMode =
          mapboxJourney.mode;

        const segments: CO2Segment[] =
          [
            {
              mode:
                emissionMode,

              distanceMeters:
                mapboxJourney.distance,
            },
          ];

        const co2 =
          calculateCO2(
            segments
          );

        return {
          type:
            "mapbox" as const,

          mode:
            mode,

          duration:
            mapboxJourney.duration,

          distance:
            mapboxJourney.distance,

          origin:
            mapboxJourney.origin,

          destination:
            mapboxJourney.destination,

          originName:
            originPoint?.name ??
            (originMode ===
            "current"
              ? "Ma position"
              : "Point de départ"),

          destinationName:
            destinationPoint?.name ??
            "Destination",

          co2Segments:
            segments,

          tripCO2Kg:
            co2.tripCO2Kg,

          referenceCarCO2Kg:
            co2.referenceCarCO2Kg,

          co2SavedKg:
            co2.co2SavedKg,

          flowsPotential:
            co2.flowsPotential,
        } satisfies SelectedJourney;
      },
      [
        mapboxJourney,
        mode,
        originMode,
        originPoint,
        destinationPoint,
      ]
    );

  function resetJourney() {
    setSelectedJourney(
      null
    );

    setSelectedJourneyId(
      null
    );

    setJourneyStatus(
      "idle"
    );

    setSuccess("");

    setError("");
  }

  async function searchTransit() {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      setError(
        "Sélectionnez un point de départ et une destination."
      );

      return;
    }

    setLoadingTransit(
      true
    );

    setError("");

    setSuccess("");

    try {
      const [
        originLng,
        originLat,
      ] =
        coordinates.origin;

      const [
        destinationLng,
        destinationLat,
      ] =
        coordinates.destination;

      const params =
        new URLSearchParams({
          from:
            `${originLng};${originLat}`,

          to:
            `${destinationLng};${destinationLat}`,

          mode:
            transitFilter,
        });

      const response =
        await fetch(
          `/api/journeys/public-transport?${params.toString()}`
        );

      const text =
        await response.text();

      if (!text) {
        throw new Error(
          "Le service de transport n'a renvoyé aucune donnée."
        );
      }

      let data: any;

      try {
        data =
          JSON.parse(
            text
          );
      } catch {
        throw new Error(
          "Réponse invalide du service de transport."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Impossible de rechercher les transports."
        );
      }

      const journeys =
        Array.isArray(
          data?.journeys
        )
          ? data.journeys
          : [];

      setTransitJourneys(
        journeys
      );

      if (
        journeys.length ===
        0
      ) {
        setError(
          "Aucun trajet en transports en commun trouvé."
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Erreur transports :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de rechercher les transports."
      );
    } finally {
      setLoadingTransit(
        false
      );
    }
  }

  function buildSelectedTransitJourney(
    journey: TransitJourney
  ): SelectedJourney | null {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      return null;
    }

    const segments =
      buildTransitCO2Segments(
        journey
      );

    const co2 =
      calculateCO2(
        segments
      );

    const distance =
      Number(
        journey.distanceMeters ??
          segments.reduce(
            (
              total,
              segment
            ) =>
              total +
              segment.distanceMeters,
            0
          )
      );

    return {
      type:
        "transit",

      mode:
        "transit",

      duration:
        Number(
          journey.duration
        ),

      distance,

      origin:
        coordinates.origin,

      destination:
        coordinates.destination,

      originName:
        originPoint?.name ??
        (originMode ===
        "current"
          ? "Ma position"
          : "Point de départ"),

      destinationName:
        destinationPoint?.name ??
        "Destination",

      co2Segments:
        segments,

      tripCO2Kg:
        co2.tripCO2Kg,

      referenceCarCO2Kg:
        co2.referenceCarCO2Kg,

      co2SavedKg:
        co2.co2SavedKg,

      flowsPotential:
        co2.flowsPotential,

      transitJourney:
        journey,
    };
  }

  async function chooseJourney(
    journey: SelectedJourney
  ) {
    setSelectingJourney(
      true
    );

    setError("");

    setSuccess("");

    try {
      const response =
        await fetch(
          "/api/journeys",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                transportMode:
                  journey.mode,

                originName:
                  journey.originName,

                destinationName:
                  journey.destinationName,

                originLng:
                  journey.origin[0],

                originLat:
                  journey.origin[1],

                destinationLng:
                  journey.destination[0],

                destinationLat:
                  journey.destination[1],

                estimatedDurationSeconds:
                  Math.max(
                    1,
                    Math.round(
                      journey.duration
                    )
                  ),

                distanceMeters:
                  journey.distance,

                co2Segments:
                  journey.co2Segments,
              }),
          }
        );

      const text =
        await response.text();

      let data: any =
        null;

      if (text) {
        try {
          data =
            JSON.parse(
              text
            );
        } catch {
          data =
            null;
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Impossible d'enregistrer le trajet."
        );
      }

      const id =
        data?.journey
          ?.id;

      if (!id) {
        throw new Error(
          "Identifiant du trajet introuvable."
        );
      }

      setSelectedJourney(
        journey
      );

      setSelectedJourneyId(
        id
      );

      setJourneyStatus(
        "planned"
      );

      setSuccess(
        "Trajet sélectionné. Vous pouvez le démarrer lorsque vous êtes prêt."
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur sélection trajet :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de sélectionner le trajet."
      );
    } finally {
      setSelectingJourney(
        false
      );
    }
  }

  async function getCurrentPosition(): Promise<GeolocationPosition> {
    const allowed =
      await canUseLocation();

    if (!allowed) {
      throw new Error(
        "La localisation est désactivée dans vos paramètres de confidentialité."
      );
    }

    if (
      !navigator.geolocation
    ) {
      throw new Error(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          () =>
            reject(
              new Error(
                "Impossible d'obtenir votre position GPS."
              )
            ),
          {
            enableHighAccuracy:
              true,

            timeout:
              10000,

            maximumAge:
              5000,
          }
        );
      }
    );
  }

  async function startJourney() {
    if (
      !selectedJourneyId
    ) {
      return;
    }

    setActionLoading(
      true
    );

    setError("");

    setSuccess("");

    try {
      const position =
        await getCurrentPosition();

      const response =
        await fetch(
          `/api/journeys/${selectedJourneyId}/start`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                lat:
                  position.coords.latitude,

                lng:
                  position.coords.longitude,
              }),
          }
        );

      const text =
        await response.text();

      let data: any =
        null;

      if (text) {
        try {
          data =
            JSON.parse(
              text
            );
        } catch {
          data =
            null;
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Impossible de démarrer le trajet."
        );
      }

      setJourneyStatus(
        "started"
      );

      setSuccess(
        "Trajet démarré."
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur démarrage trajet :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de démarrer le trajet."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  async function completeJourney() {
    if (
      !selectedJourneyId
    ) {
      return;
    }

    setActionLoading(
      true
    );

    setError("");

    setSuccess("");

    try {
      const position =
        await getCurrentPosition();

      const response =
        await fetch(
          `/api/journeys/${selectedJourneyId}/complete`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                lat:
                  position.coords.latitude,

                lng:
                  position.coords.longitude,
              }),
          }
        );

      const text =
        await response.text();

      let data: any =
        null;

      if (text) {
        try {
          data =
            JSON.parse(
              text
            );
        } catch {
          data =
            null;
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Impossible de terminer le trajet."
        );
      }

      const earnedCO2 =
        selectedJourney
          ?.co2SavedKg ??
        0;

      const earnedFlows =
        selectedJourney
          ?.flowsPotential ??
        0;

      setSelectedJourneyId(
        null
      );

      setJourneyStatus(
        "idle"
      );

      setSelectedJourney(
        null
      );

      setSuccess(
        `Trajet terminé ! +${earnedCO2.toFixed(
          2
        )} kg de CO₂ économisés et +${earnedFlows} FLOWS.`
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur fin trajet :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible de terminer le trajet."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  /*
   * ANNULATION :
   * fonctionne maintenant pour
   * planned ET started.
   */
  async function cancelSelectedJourney() {
    if (
      !selectedJourneyId
    ) {
      resetJourney();
      return;
    }

    setActionLoading(
      true
    );

    setError("");

    setSuccess("");

    try {
      const response =
        await fetch(
          `/api/journeys/${selectedJourneyId}/cancel`,
          {
            method:
              "POST",
          }
        );

      const text =
        await response.text();

      let data: any =
        null;

      if (text) {
        try {
          data =
            JSON.parse(
              text
            );
        } catch {
          data =
            null;
        }
      }

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Impossible d'annuler le trajet."
        );
      }

      setSelectedJourney(
        null
      );

      setSelectedJourneyId(
        null
      );

      setJourneyStatus(
        "idle"
      );

      setSuccess(
        "Le trajet a été annulé."
      );
    } catch (
      error
    ) {
      console.error(
        "Erreur annulation trajet :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Impossible d'annuler le trajet."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  const mapMode:
    MapboxTravelMode | null =
    mode === "transit"
      ? null
      : mode;

  return (
    <div className="mt-6">

      {/* Mode de départ */}
      {journeyStatus ===
        "idle" && (
        <>
          <section>

            <p className="uf-label text-secondary">
              Point de départ
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setOriginMode(
                    "current"
                  )
                }
                className={`rounded-[16px] border p-3 text-sm font-semibold transition ${
                  originMode ===
                  "current"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Ma position
              </button>

              <button
                type="button"
                onClick={() =>
                  setOriginMode(
                    "custom"
                  )
                }
                className={`rounded-[16px] border p-3 text-sm font-semibold transition ${
                  originMode ===
                  "custom"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Choisir un départ
              </button>

            </div>

          </section>

          {/* Modes transport */}
          <section className="mt-6">

            <p className="uf-label text-secondary">
              Mode de transport
            </p>

            <div className="mt-3 grid grid-cols-4 gap-2">

              {transportModes.map(
                (
                  transport
                ) => {
                  const Icon =
                    transport.icon;

                  const active =
                    mode ===
                    transport.id;

                  return (
                    <button
                      key={
                        transport.id
                      }
                      type="button"
                      onClick={() => {
                        setMode(
                          transport.id
                        );

                        setTransitJourneys(
                          []
                        );

                        setError(
                          ""
                        );
                      }}
                      className={`flex flex-col items-center gap-2 rounded-[16px] border px-2 py-3 transition ${
                        active
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-surface text-muted"
                      }`}
                    >
                      <Icon
                        size={
                          19
                        }
                      />

                      <span className="text-[11px] font-semibold">
                        {
                          transport.label
                        }
                      </span>
                    </button>
                  );
                }
              )}

            </div>

          </section>
        </>
      )}

      {/* Carte */}
      <UrbanFlowMap
        mode={
          mapMode
        }
        originMode={
          originMode
        }
        initialDestination={
          destinationPoint
        }
        onCoordinatesChange={
          setCoordinates
        }
        onOriginChange={
          setOriginPoint
        }
        onDestinationChange={
          setDestinationPoint
        }
        onRouteChange={
          setMapboxJourney
        }
      />

      {/* Recherche transport */}
      {mode ===
        "transit" &&
        journeyStatus ===
          "idle" && (
          <section className="mt-5">

            <div className="flex gap-2 overflow-x-auto pb-2">

              {transitFilters.map(
                (
                  filter
                ) => (
                  <button
                    key={
                      filter.id
                    }
                    type="button"
                    onClick={() =>
                      setTransitFilter(
                        filter.id
                      )
                    }
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      transitFilter ===
                      filter.id
                        ? "bg-primary text-white"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {
                      filter.label
                    }
                  </button>
                )
              )}

            </div>

            <button
              type="button"
              onClick={
                searchTransit
              }
              disabled={
                loadingTransit
              }
              className="uf-btn-primary mt-3 flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingTransit ? (
                <>
                  <LoaderCircle
                    size={
                      17
                    }
                    className="animate-spin"
                  />

                  Recherche...
                </>
              ) : (
                <>
                  <Navigation
                    size={
                      17
                    }
                  />

                  Rechercher les transports
                </>
              )}
            </button>

          </section>
        )}

      {/* Résultat Mapbox */}
      {journeyStatus ===
        "idle" &&
        mode !==
          "transit" &&
        mapboxOption && (
          <section className="mt-6">

            <h2 className="uf-h3 text-secondary">
              Itinéraire proposé
            </h2>

            <div className="uf-card mt-3 p-5">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="uf-label text-secondary">
                    {
                      transportModes.find(
                        (
                          item
                        ) =>
                          item.id ===
                          mode
                      )
                        ?.label
                    }
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-muted">

                    <span className="flex items-center gap-1 uf-caption">
                      <Clock3
                        size={
                          14
                        }
                      />

                      {formatDuration(
                        mapboxOption.duration
                      )}
                    </span>

                    <span className="flex items-center gap-1 uf-caption">
                      <Route
                        size={
                          14
                        }
                      />

                      {formatDistance(
                        mapboxOption.distance,
                        settings.distance_unit
                      )}
                    </span>

                  </div>

                </div>

                {settings.eco_priority &&
                  mapboxOption.co2SavedKg >
                    0 && (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                      Éco
                    </span>
                  )}

              </div>

              {(settings.show_co2 ||
                settings.show_flows) && (
                <div className="mt-4 flex flex-wrap gap-2">

                  {settings.show_co2 && (
                    <span className="rounded-full bg-primary-soft px-3 py-2 uf-caption font-semibold text-primary">
                      <Leaf
                        size={
                          13
                        }
                        className="mr-1 inline"
                      />

                      {mapboxOption.co2SavedKg.toFixed(
                        2
                      )}{" "}
                      kg CO₂
                    </span>
                  )}

                  {settings.show_flows && (
                    <span className="rounded-full bg-accent-soft px-3 py-2 uf-caption font-semibold text-accent">
                      +
                      {
                        mapboxOption.flowsPotential
                      }{" "}
                      FLOWS
                    </span>
                  )}

                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  chooseJourney(
                    mapboxOption
                  )
                }
                disabled={
                  selectingJourney
                }
                className="uf-btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {selectingJourney ? (
                  <>
                    <LoaderCircle
                      size={
                        17
                      }
                      className="animate-spin"
                    />

                    Sélection...
                  </>
                ) : (
                  <>
                    <Check
                      size={
                        17
                      }
                    />

                    Choisir ce trajet
                  </>
                )}
              </button>

            </div>

          </section>
        )}

      {/* Résultats transports */}
      {journeyStatus ===
        "idle" &&
        mode ===
          "transit" &&
        transitJourneys.length >
          0 && (
          <section className="mt-6">

            <h2 className="uf-h3 text-secondary">
              Itinéraires proposés
            </h2>

            <div className="mt-3 space-y-4">

              {transitJourneys.map(
                (
                  transitJourney,
                  index
                ) => {
                  const option =
                    buildSelectedTransitJourney(
                      transitJourney
                    );

                  if (
                    !option
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={
                        transitJourney.id ??
                        index
                      }
                      className="uf-card p-5"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="uf-label text-secondary">
                            Transports en commun
                          </p>

                          <p className="uf-caption mt-1 text-muted">
                            {formatTransitTime(
                              transitJourney.departureDateTime
                            )}
                            {" → "}
                            {formatTransitTime(
                              transitJourney.arrivalDateTime
                            )}
                          </p>

                        </div>

                        {index ===
                          0 && (
                          <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                            Recommandé
                          </span>
                        )}

                      </div>

                      <div className="mt-4 flex flex-wrap gap-4">

                        <span className="flex items-center gap-1 uf-caption text-muted">
                          <Clock3
                            size={
                              14
                            }
                          />

                          {formatDuration(
                            transitJourney.duration
                          )}
                        </span>

                        <span className="flex items-center gap-1 uf-caption text-muted">
                          <Route
                            size={
                              14
                            }
                          />

                          {formatDistance(
                            option.distance,
                            settings.distance_unit
                          )}
                        </span>

                        <span className="uf-caption text-muted">
                          {
                            transitJourney.transfers ??
                            0
                          }{" "}
                          correspondance
                          {(transitJourney.transfers ??
                            0) >
                          1
                            ? "s"
                            : ""}
                        </span>

                      </div>

                      {/* Détail des sections */}
                      {transitJourney.sections &&
                        transitJourney.sections.length >
                          0 && (
                          <div className="mt-5 space-y-4 border-t border-border pt-4">

                            {transitJourney.sections.map(
                              (
                                section,
                                sectionIndex
                              ) => {
                                const SectionIcon =
                                  getSectionIcon(
                                    section
                                  );

                                return (
                                  <div
                                    key={
                                      sectionIndex
                                    }
                                    className="flex gap-3"
                                  >

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                                      <SectionIcon
                                        size={
                                          16
                                        }
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">

                                      <div className="flex items-center justify-between gap-3">

                                        <p className="uf-label text-secondary">
                                          {getSectionLabel(
                                            section
                                          )}
                                        </p>

                                        {!!section.duration && (
                                          <p className="uf-caption shrink-0 text-muted">
                                            {formatDuration(
                                              section.duration
                                            )}
                                          </p>
                                        )}

                                      </div>

                                      {section.direction && (
                                        <p className="uf-caption mt-1 text-muted">
                                          Direction{" "}
                                          {
                                            section.direction
                                          }
                                        </p>
                                      )}

                                      {(section.from ||
                                        section.to) && (
                                        <p className="uf-caption mt-1 text-muted">
                                          {section.from ??
                                            "Départ"}
                                          {" → "}
                                          {section.to ??
                                            "Arrivée"}
                                        </p>
                                      )}

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>
                        )}

                      {(settings.show_co2 ||
                        settings.show_flows) && (
                        <div className="mt-5 flex flex-wrap gap-2">

                          {settings.show_co2 && (
                            <span className="rounded-full bg-primary-soft px-3 py-2 uf-caption font-semibold text-primary">
                              <Leaf
                                size={
                                  13
                                }
                                className="mr-1 inline"
                              />

                              {option.co2SavedKg.toFixed(
                                2
                              )}{" "}
                              kg CO₂
                            </span>
                          )}

                          {settings.show_flows && (
                            <span className="rounded-full bg-accent-soft px-3 py-2 uf-caption font-semibold text-accent">
                              +
                              {
                                option.flowsPotential
                              }{" "}
                              FLOWS
                            </span>
                          )}

                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          chooseJourney(
                            option
                          )
                        }
                        disabled={
                          selectingJourney
                        }
                        className="uf-btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <Check
                          size={
                            17
                          }
                        />

                        Choisir ce trajet
                      </button>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

      {/* Trajet sélectionné / en cours */}
      {selectedJourney &&
        journeyStatus !==
          "idle" && (
          <section className="mt-6">

            <h2 className="uf-h3 text-secondary">
              {journeyStatus ===
              "started"
                ? "Trajet en cours"
                : "Trajet sélectionné"}
            </h2>

            <div className="uf-card mt-3 p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MapPin
                    size={
                      19
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="uf-label truncate text-secondary">
                    {
                      selectedJourney.destinationName
                    }
                  </p>

                  <p className="uf-caption mt-1 text-muted">
                    {formatDuration(
                      selectedJourney.duration
                    )}
                    {" · "}
                    {formatDistance(
                      selectedJourney.distance,
                      settings.distance_unit
                    )}
                  </p>

                </div>

              </div>

              {(settings.show_co2 ||
                settings.show_flows) && (
                <div className="mt-4 flex flex-wrap gap-2">

                  {settings.show_co2 && (
                    <span className="rounded-full bg-primary-soft px-3 py-2 uf-caption font-semibold text-primary">
                      {selectedJourney.co2SavedKg.toFixed(
                        2
                      )}{" "}
                      kg CO₂
                    </span>
                  )}

                  {settings.show_flows && (
                    <span className="rounded-full bg-accent-soft px-3 py-2 uf-caption font-semibold text-accent">
                      +
                      {
                        selectedJourney.flowsPotential
                      }{" "}
                      FLOWS potentiels
                    </span>
                  )}

                </div>
              )}

              {/* PLANNED */}
              {journeyStatus ===
                "planned" && (
                <div className="mt-5 space-y-3">

                  <button
                    type="button"
                    onClick={
                      startJourney
                    }
                    disabled={
                      actionLoading
                    }
                    className="uf-btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <LoaderCircle
                        size={
                          17
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Navigation
                        size={
                          17
                        }
                      />
                    )}

                    Démarrer le trajet
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelSelectedJourney
                    }
                    disabled={
                      actionLoading
                    }
                    className="uf-btn-secondary w-full disabled:opacity-60"
                  >
                    Changer de trajet
                  </button>

                </div>
              )}

              {/* STARTED */}
              {journeyStatus ===
                "started" && (
                <div className="mt-5 space-y-3">

                  <button
                    type="button"
                    onClick={
                      completeJourney
                    }
                    disabled={
                      actionLoading
                    }
                    className="uf-btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <LoaderCircle
                        size={
                          17
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Check
                        size={
                          17
                        }
                      />
                    )}

                    Terminer le trajet
                  </button>

                  {/* NOUVEAU */}
                  <button
                    type="button"
                    onClick={
                      cancelSelectedJourney
                    }
                    disabled={
                      actionLoading
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-error px-4 py-3 font-semibold text-error transition hover:bg-error/5 disabled:opacity-60"
                  >
                    <X
                      size={
                        17
                      }
                    />

                    Annuler le trajet
                  </button>

                </div>
              )}

            </div>

          </section>
        )}

      {/* Messages */}
      {error && (
        <div className="mt-5 rounded-[16px] bg-error/10 p-4">

          <p className="uf-caption text-error">
            {error}
          </p>

        </div>
      )}

      {success && (
        <div className="mt-5 rounded-[16px] bg-primary-soft p-4">

          <p className="uf-caption font-semibold text-primary">
            {success}
          </p>

        </div>
      )}

    </div>
  );
}
