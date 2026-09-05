"use client";

import {
  Bike,
  Bus,
  Car,
  Check,
  Clock3,
  Footprints,
  Leaf,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCcw,
  Sparkles,
  TrainFront,
} from "lucide-react";

import { useSearchParams } from "next/navigation";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import UrbanFlowMap, {
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

type ModeId =
  | "walking"
  | "cycling"
  | "driving"
  | "transit";

type OriginMode =
  | "current"
  | "custom";

type TransitMode =
  | "all"
  | "metro"
  | "bus"
  | "tram"
  | "train";

type JourneySettings = {
  default_transport_mode: ModeId;
  show_co2: boolean;
  show_flows: boolean;
  eco_priority: boolean;
  distance_unit: "km" | "m";
};

type TransitSection = {
  type?: string | null;
  mode?: string | null;
  physicalMode?: string | null;
  commercialMode?: string | null;
  line?: string | null;
  lineName?: string | null;
  direction?: string | null;
  duration?: number | null;
  distanceMeters?: number | null;
  from?: string | null;
  to?: string | null;
};

type TransitJourney = {
  duration: number;
  departureDateTime?: string | null;
  arrivalDateTime?: string | null;
  transfers?: number;
  walkingDuration?: number;
  sections?: TransitSection[];
};

const modes = [
  {
    id: "walking" as const,
    label: "Marche",
    icon: Footprints,
  },
  {
    id: "cycling" as const,
    label: "Vélo",
    icon: Bike,
  },
  {
    id: "driving" as const,
    label: "Voiture",
    icon: Car,
  },
  {
    id: "transit" as const,
    label: "Transports",
    icon: Bus,
  },
];

const transitModes: {
  id: TransitMode;
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

  const remaining =
    minutes % 60;

  return remaining
    ? `${hours} h ${remaining} min`
    : `${hours} h`;
}

function formatTransitTime(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  /*
   * Navitia renvoie souvent :
   * 20260905T083000
   */
  if (
    /^\d{8}T\d{6}$/.test(
      value
    )
  ) {
    return `${value.slice(
      9,
      11
    )}:${value.slice(
      11,
      13
    )}`;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function getTransitEmissionMode(
  section: TransitSection
):
  | "walking"
  | "metro"
  | "bus"
  | "tram"
  | "train" {
  const value =
    `${section.mode ?? ""} ${section.physicalMode ?? ""} ${section.commercialMode ?? ""}`
      .toLowerCase();

  if (
    value.includes("metro")
  ) {
    return "metro";
  }

  if (
    value.includes("tram")
  ) {
    return "tram";
  }

  if (
    value.includes("bus")
  ) {
    return "bus";
  }

  if (
    value.includes("train") ||
    value.includes("rail") ||
    value.includes("rer") ||
    value.includes("transilien")
  ) {
    return "train";
  }

  return "walking";
}

function buildTransitCO2Segments(
  journey: TransitJourney
): CO2Segment[] {
  return (
    journey.sections ?? []
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
        segment.distanceMeters >
        0
    );
}

function getSectionLabel(
  section: TransitSection
) {
  const mode =
    getTransitEmissionMode(
      section
    );

  if (mode === "walking") {
    return "Marche";
  }

  if (
    section.lineName &&
    section.line
  ) {
    if (
      section.lineName
        .toLowerCase()
        .includes(
          section.line.toLowerCase()
        )
    ) {
      return section.lineName;
    }

    return `${section.lineName} ${section.line}`;
  }

  if (section.lineName) {
    return section.lineName;
  }

  if (section.line) {
    if (mode === "bus") {
      return `Bus ${section.line}`;
    }

    if (mode === "metro") {
      return `Métro ${section.line}`;
    }

    if (mode === "tram") {
      return `Tram ${section.line}`;
    }

    return `Train ${section.line}`;
  }

  if (section.commercialMode) {
    return section.commercialMode;
  }

  if (section.physicalMode) {
    return section.physicalMode;
  }

  switch (mode) {
    case "metro":
      return "Métro";

    case "bus":
      return "Bus";

    case "tram":
      return "Tram";

    case "train":
      return "Train";

    default:
      return "Marche";
  }
}

function getSectionIcon(
  section: TransitSection
) {
  const mode =
    getTransitEmissionMode(
      section
    );

  if (mode === "bus") {
    return Bus;
  }

  if (
    mode === "metro" ||
    mode === "tram" ||
    mode === "train"
  ) {
    return TrainFront;
  }

  return Footprints;
}

export default function JourneyPlanner() {
  const searchParams =
    useSearchParams();

  const savedDestination =
    searchParams.get(
      "destination"
    );

  const [
    selectedMode,
    setSelectedMode,
  ] =
    useState<ModeId>(
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
    mapboxRoute,
    setMapboxRoute,
  ] =
    useState<MapboxJourneyData | null>(
      null
    );

  const [
    transitMode,
    setTransitMode,
  ] =
    useState<TransitMode>(
      "all"
    );

  const [
    transitJourneys,
    setTransitJourneys,
  ] =
    useState<
      TransitJourney[]
    >([]);

  const [
    selectedTransitIndex,
    setSelectedTransitIndex,
  ] =
    useState<
      number | null
    >(null);

  const [
    loadingTransit,
    setLoadingTransit,
  ] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    selectedJourneyId,
    setSelectedJourneyId,
  ] =
    useState<
      string | null
    >(null);

  const [
    journeyStatus,
    setJourneyStatus,
  ] =
    useState<
      | "idle"
      | "planned"
      | "started"
      | "completed"
    >("idle");

  const [
    creatingJourney,
    setCreatingJourney,
  ] =
    useState(false);

  const [
    startingJourney,
    setStartingJourney,
  ] =
    useState(false);

  const [
    completingJourney,
    setCompletingJourney,
  ] =
    useState(false);

  const [
    completionReward,
    setCompletionReward,
  ] =
    useState<{
      co2_saved?: number;
      flows_earned?: number;
    } | null>(
      null
    );

  const [
    showCO2,
    setShowCO2,
  ] =
    useState(true);

  const [
    showFlows,
    setShowFlows,
  ] =
    useState(true);

  const [
    ecoPriority,
    setEcoPriority,
  ] =
    useState(false);

  const [
    distanceUnit,
    setDistanceUnit,
  ] =
    useState<
      "km" | "m"
    >("km");

  const [
    settingsLoaded,
    setSettingsLoaded,
  ] =
    useState(false);

  const [
    savedDestinationLoading,
    setSavedDestinationLoading,
  ] =
    useState(false);

  /*
   * Paramètres utilisateur
   */
  useEffect(() => {
    async function loadJourneySettings() {
      const supabase =
        createClient();

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setSettingsLoaded(
          true
        );

        return;
      }

      const {
        data,
        error,
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

      if (error) {
        console.error(
          "Erreur chargement paramètres trajet :",
          error
        );

        setSettingsLoaded(
          true
        );

        return;
      }

      const settings =
        data as JourneySettings;

      const mode =
        settings.default_transport_mode;

      if (
        mode === "walking" ||
        mode === "cycling" ||
        mode === "driving" ||
        mode === "transit"
      ) {
        setSelectedMode(
          mode
        );
      }

      setShowCO2(
        settings.show_co2 ??
          true
      );

      setShowFlows(
        settings.show_flows ??
          true
      );

      setEcoPriority(
        settings.eco_priority ??
          false
      );

      setDistanceUnit(
        settings.distance_unit ??
          "km"
      );

      setSettingsLoaded(
        true
      );
    }

    loadJourneySettings();
  }, []);

  /*
   * Destination Maison / Travail
   */
  useEffect(() => {
    async function loadSavedDestination() {
      if (
        !savedDestination
      ) {
        return;
      }

      const accessToken =
        process.env
          .NEXT_PUBLIC_MAPBOX_TOKEN;

      if (!accessToken) {
        setActionError(
          "La clé Mapbox est manquante."
        );

        return;
      }

      setSavedDestinationLoading(
        true
      );

      setActionError("");

      try {
        const response =
          await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              savedDestination
            )}.json?access_token=${accessToken}&country=FR&language=fr&limit=1`
          );

        if (!response.ok) {
          throw new Error(
            "Impossible de localiser le lieu enregistré."
          );
        }

        const data =
          await response.json();

        const feature =
          data.features?.[0];

        const coords =
          feature
            ?.geometry
            ?.coordinates;

        if (
          !Array.isArray(
            coords
          ) ||
          coords.length < 2
        ) {
          throw new Error(
            "Impossible de trouver cette adresse."
          );
        }

        const destinationCoordinates: [
          number,
          number
        ] = [
          Number(coords[0]),
          Number(coords[1]),
        ];

        const point:
          JourneyPoint = {
          name:
            savedDestination,

          coordinates:
            destinationCoordinates,
        };

        setOriginMode(
          "current"
        );

        setDestinationPoint(
          point
        );

        setCoordinates(
          (current) => ({
            ...current,

            destination:
              destinationCoordinates,
          })
        );
      } catch (error) {
        console.error(
          "Erreur lieu enregistré :",
          error
        );

        setActionError(
          error instanceof Error
            ? error.message
            : "Impossible de charger ce lieu enregistré."
        );
      } finally {
        setSavedDestinationLoading(
          false
        );
      }
    }

    loadSavedDestination();
  }, [
    savedDestination,
  ]);

  function formatDistance(
    meters: number
  ) {
    if (
      distanceUnit === "m"
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
      meters / 1000
    ).toFixed(1)} km`;
  }

  function resetJourneySelection() {
    setSelectedJourneyId(
      null
    );

    setJourneyStatus(
      "idle"
    );

    setSelectedTransitIndex(
      null
    );

    setCompletionReward(
      null
    );

    setActionError(
      ""
    );
  }
  async function cancelSelectedJourney() {
    if (
      !selectedJourneyId
    ) {
      resetJourneySelection();
      return;
    }
  
    if (
      journeyStatus !==
      "planned"
    ) {
      resetJourneySelection();
      return;
    }
  
    setActionError("");
  
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
  
      let data:
        | {
            success?: boolean;
            error?: string;
          }
        | null =
        null;
  
      if (text) {
        try {
          data =
            JSON.parse(text);
        } catch {
          console.error(
            "Réponse annulation invalide :",
            text
          );
        }
      }
  
      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            "Impossible d'annuler le trajet."
        );
      }
  
      resetJourneySelection();
  
      setTransitJourneys(
        []
      );
  
      setMapboxRoute(
        null
      );
    } catch (error) {
      console.error(
        "Erreur annulation trajet :",
        error
      );
  
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible d'annuler le trajet."
      );
    }
  }
  function changeOriginMode(
    value: OriginMode
  ) {
    if (
      journeyStatus ===
      "started"
    ) {
      return;
    }

    resetJourneySelection();

    setOriginMode(
      value
    );

    setOriginPoint(
      null
    );

    setCoordinates(
      (current) => ({
        ...current,
        origin: null,
      })
    );

    setMapboxRoute(
      null
    );

    setTransitJourneys(
      []
    );
  }

  const mapboxCO2 =
    useMemo(() => {
      if (
        !mapboxRoute
      ) {
        return null;
      }

      const mode =
        mapboxRoute.mode ===
        "walking"
          ? "walking"
          : mapboxRoute.mode ===
              "cycling"
            ? "cycling"
            : "driving";

      return calculateCO2([
        {
          mode,

          distanceMeters:
            mapboxRoute.distance,
        },
      ]);
    }, [
      mapboxRoute,
    ]);

  async function searchTransit() {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      setActionError(
        "Choisissez un point de départ et une destination."
      );

      return;
    }

    setActionError("");
    setLoadingTransit(true);
    setTransitJourneys([]);
    setSelectedTransitIndex(null);

    try {
      const response =
        await fetch(
          "/api/journeys/public-transport",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                origin: {
                  lng:
                    coordinates.origin[0],

                  lat:
                    coordinates.origin[1],
                },

                destination: {
                  lng:
                    coordinates.destination[0],

                  lat:
                    coordinates.destination[1],
                },

                mode:
                  transitMode,
              }),
          }
        );

      const text =
        await response.text();

      if (!text) {
        throw new Error(
          `Le service de transport n'a renvoyé aucune réponse (${response.status}).`
        );
      }

      let data: {
        journeys?: TransitJourney[];
        error?: string;
      };

      try {
        data =
          JSON.parse(text);
      } catch {
        console.error(
          "Réponse transports non JSON :",
          text
        );

        throw new Error(
          "La réponse du service de transport est invalide."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            `Erreur transport (${response.status}).`
        );
      }

      const journeys =
        data.journeys ??
        [];

      if (
        !Array.isArray(
          journeys
        ) ||
        journeys.length === 0
      ) {
        setActionError(
          "Aucun trajet en transport en commun trouvé."
        );

        return;
      }

      setTransitJourneys(
        journeys
      );
    } catch (error) {
      console.error(
        "Erreur recherche transports :",
        error
      );

      setActionError(
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

  function getSelectedJourneyData() {
    if (
      selectedMode !==
      "transit"
    ) {
      if (
        !mapboxRoute ||
        !mapboxCO2
      ) {
        return null;
      }

      return {
        duration:
          mapboxRoute.duration,

        distance:
          mapboxRoute.distance,

        co2Segments: [
          {
            mode:
              selectedMode ===
              "walking"
                ? "walking"
                : selectedMode ===
                    "cycling"
                  ? "cycling"
                  : "driving",

            distanceMeters:
              mapboxRoute.distance,
          },
        ] as CO2Segment[],
      };
    }

    if (
      selectedTransitIndex ===
      null
    ) {
      return null;
    }

    const journey =
      transitJourneys[
        selectedTransitIndex
      ];

    if (!journey) {
      return null;
    }

    const segments =
      buildTransitCO2Segments(
        journey
      );

    const distance =
      segments.reduce(
        (
          total,
          segment
        ) =>
          total +
          segment.distanceMeters,
        0
      );

    return {
      duration:
        journey.duration,

      distance,

      co2Segments:
        segments,
    };
  }

  async function chooseJourney(
    transitIndex?: number
  ) {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      setActionError(
        "Choisissez un départ et une destination."
      );

      return;
    }

    if (
      selectedMode ===
        "transit" &&
      typeof transitIndex ===
        "number"
    ) {
      setSelectedTransitIndex(
        transitIndex
      );
    }

    const selectedData =
      selectedMode ===
        "transit" &&
      typeof transitIndex ===
        "number"
        ? (() => {
            const journey =
              transitJourneys[
                transitIndex
              ];

            if (!journey) {
              return null;
            }

            const segments =
              buildTransitCO2Segments(
                journey
              );

            return {
              duration:
                journey.duration,

              distance:
                segments.reduce(
                  (
                    total,
                    segment
                  ) =>
                    total +
                    segment.distanceMeters,
                  0
                ),

              co2Segments:
                segments,
            };
          })()
        : getSelectedJourneyData();

    if (!selectedData) {
      setActionError(
        "Impossible de sélectionner ce trajet."
      );

      return;
    }

    setCreatingJourney(
      true
    );

    setActionError("");

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
                  selectedMode,

                originName:
                  originPoint?.name ??
                  (originMode ===
                  "current"
                    ? "Ma position actuelle"
                    : "Point de départ"),

                destinationName:
                  destinationPoint?.name ??
                  "Destination",

                originLng:
                  coordinates.origin[0],

                originLat:
                  coordinates.origin[1],

                destinationLng:
                  coordinates.destination[0],

                destinationLat:
                  coordinates.destination[1],

                estimatedDurationSeconds:
                  Math.round(
                    selectedData.duration
                  ),

                distanceMeters:
                  selectedData.distance,

                co2Segments:
                  selectedData.co2Segments,
              }),
          }
        );

      const text =
        await response.text();

      if (!text) {
        throw new Error(
          "Le serveur n'a renvoyé aucune réponse."
        );
      }

      const data =
        JSON.parse(text);

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Impossible d'enregistrer le trajet."
        );
      }

      setSelectedJourneyId(
        data.journey?.id ??
          data.id
      );

      setJourneyStatus(
        "planned"
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de sélectionner ce trajet."
      );
    } finally {
      setCreatingJourney(
        false
      );
    }
  }

  async function startJourney() {
    const allowed =
      await canUseLocation();

    if (!allowed) {
      setActionError(
        "La localisation est désactivée dans vos paramètres de confidentialité."
      );

      return;
    }

    if (
      !selectedJourneyId
    ) {
      return;
    }

    if (
      !navigator.geolocation
    ) {
      setActionError(
        "La géolocalisation n'est pas disponible."
      );

      return;
    }

    setStartingJourney(
      true
    );

    setActionError("");

    navigator.geolocation.getCurrentPosition(
      async (
        position
      ) => {
        try {
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
                      position
                        .coords
                        .latitude,

                    lng:
                      position
                        .coords
                        .longitude,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
                "Impossible de démarrer le trajet."
            );
          }

          setJourneyStatus(
            "started"
          );
        } catch (error) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Impossible de démarrer le trajet."
          );
        } finally {
          setStartingJourney(
            false
          );
        }
      },

      () => {
        setActionError(
          "Impossible de récupérer votre position."
        );

        setStartingJourney(
          false
        );
      },

      {
        enableHighAccuracy:
          true,

        timeout:
          10000,
      }
    );
  }

  async function completeJourney() {
    const allowed =
      await canUseLocation();

    if (!allowed) {
      setActionError(
        "La localisation est désactivée dans vos paramètres de confidentialité."
      );

      return;
    }

    if (
      !selectedJourneyId
    ) {
      return;
    }

    if (
      !navigator.geolocation
    ) {
      setActionError(
        "La géolocalisation n'est pas disponible."
      );

      return;
    }

    setCompletingJourney(
      true
    );

    setActionError("");

    navigator.geolocation.getCurrentPosition(
      async (
        position
      ) => {
        try {
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
                      position
                        .coords
                        .latitude,

                    lng:
                      position
                        .coords
                        .longitude,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
                "Impossible de terminer le trajet."
            );
          }

          setCompletionReward(
            data.reward ??
              null
          );

          setJourneyStatus(
            "completed"
          );
        } catch (error) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Impossible de terminer le trajet."
          );
        } finally {
          setCompletingJourney(
            false
          );
        }
      },

      () => {
        setActionError(
          "Impossible de récupérer votre position."
        );

        setCompletingJourney(
          false
        );
      },

      {
        enableHighAccuracy:
          true,

        timeout:
          10000,
      }
    );
  }

  if (
    !settingsLoaded
  ) {
    return (
      <div className="mt-8 flex items-center justify-center py-10">

        <LoaderCircle
          size={22}
          className="animate-spin text-primary"
        />

      </div>
    );
  }

  const mapMode:
    | MapboxTravelMode
    | null =
    selectedMode ===
    "transit"
      ? null
      : selectedMode;

  return (
    <div className="mt-6">

      {/* Choix départ */}
      <section className="uf-card p-4">

        <p className="uf-label text-secondary">
          Point de départ
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">

          <button
            type="button"
            disabled={
              journeyStatus ===
              "started"
            }
            onClick={() =>
              changeOriginMode(
                "current"
              )
            }
            className={`flex items-center justify-center gap-2 rounded-[16px] border px-3 py-3 text-sm font-semibold transition ${
              originMode ===
              "current"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-secondary"
            }`}
          >

            <LocateFixed
              size={17}
            />

            Ma position

          </button>

          <button
            type="button"
            disabled={
              journeyStatus ===
              "started"
            }
            onClick={() =>
              changeOriginMode(
                "custom"
              )
            }
            className={`flex items-center justify-center gap-2 rounded-[16px] border px-3 py-3 text-sm font-semibold transition ${
              originMode ===
              "custom"
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-secondary"
            }`}
          >

            <MapPin
              size={17}
            />

            Choisir un départ

          </button>

        </div>

      </section>

      {/* Modes */}
      <section className="mt-5">

        <p className="uf-label text-secondary">
          Mode de transport
        </p>

        <div className="mt-3 grid grid-cols-4 gap-2">

          {modes.map(
            ({
              id,
              label,
              icon:
                Icon,
            }) => {
              const active =
                selectedMode ===
                id;

              return (
                <button
                  key={id}
                  type="button"
                  disabled={
                    journeyStatus ===
                    "started"
                  }
                  onClick={() => {
                    setSelectedMode(
                      id
                    );

                    resetJourneySelection();

                    setTransitJourneys(
                      []
                    );
                  }}
                  className={`flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[16px] border px-2 transition ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted"
                  }`}
                >

                  <Icon
                    size={19}
                  />

                  <span className="text-[11px] font-semibold">
                    {label}
                  </span>

                </button>
              );
            }
          )}

        </div>

      </section>

      {savedDestinationLoading && (
        <div className="mt-5 flex items-center gap-2 rounded-[16px] bg-primary-soft p-4">

          <LoaderCircle
            size={17}
            className="animate-spin text-primary"
          />

          <p className="uf-caption font-semibold text-primary">
            Chargement du lieu enregistré...
          </p>

        </div>
      )}

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
        onRouteChange={
          setMapboxRoute
        }
        onOriginChange={
          setOriginPoint
        }
        onDestinationChange={
          setDestinationPoint
        }
      />

      {/* Itinéraire Mapbox */}
      {selectedMode !==
        "transit" &&
        mapboxRoute &&
        mapboxCO2 && (
          <section className="uf-card mt-5 p-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="uf-label text-secondary">
                  Itinéraire proposé
                </p>

                <div className="mt-2 flex items-center gap-4 text-muted">

                  <span className="flex items-center gap-1 text-sm">

                    <Clock3
                      size={15}
                    />

                    {formatDuration(
                      mapboxRoute.duration
                    )}

                  </span>

                  <span className="text-sm">
                    {formatDistance(
                      mapboxRoute.distance
                    )}
                  </span>

                </div>

              </div>

              {ecoPriority && (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                  Option écologique
                </span>
              )}

            </div>

            {(showCO2 ||
              showFlows) && (
              <div
                className={`mt-4 grid gap-3 ${
                  showCO2 &&
                  showFlows
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >

                {showCO2 && (
                  <div className="rounded-[16px] bg-primary-soft p-3">

                    <Leaf
                      size={17}
                      className="text-primary"
                    />

                    <p className="mt-2 text-lg font-bold text-primary">
                      {mapboxCO2.co2SavedKg.toFixed(
                        2
                      )}{" "}
                      kg
                    </p>

                    <p className="uf-caption text-muted">
                      CO₂ économisé
                    </p>

                  </div>
                )}

                {showFlows && (
                  <div className="rounded-[16px] bg-secondary-soft p-3">

                    <Sparkles
                      size={17}
                      className="text-secondary"
                    />

                    <p className="mt-2 text-lg font-bold text-secondary">
                      {
                        mapboxCO2.flowsPotential
                      }
                    </p>

                    <p className="uf-caption text-muted">
                      FLOWS potentiels
                    </p>

                  </div>
                )}

              </div>
            )}

            {journeyStatus ===
              "idle" && (
              <button
                type="button"
                disabled={
                  creatingJourney
                }
                onClick={() =>
                  chooseJourney()
                }
                className="uf-btn-primary mt-5"
              >

                {creatingJourney ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="mr-2 animate-spin"
                    />

                    Sélection...
                  </>
                ) : (
                  "Choisir ce trajet"
                )}

              </button>
            )}

          </section>
        )}

      {/* Transports en commun */}
      {selectedMode ===
        "transit" && (
          <section className="mt-5">

            <div className="flex gap-2 overflow-x-auto pb-2">

              {transitModes.map(
                ({
                  id,
                  label,
                }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={
                      journeyStatus ===
                      "started"
                    }
                    onClick={() =>
                      setTransitMode(
                        id
                      )
                    }
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${
                      transitMode ===
                      id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {label}
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
                loadingTransit ||
                !coordinates.origin ||
                !coordinates.destination ||
                journeyStatus ===
                  "started"
              }
              className="uf-btn-primary mt-3"
            >

              {loadingTransit ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="mr-2 animate-spin"
                  />

                  Recherche...
                </>
              ) : (
                <>
                  <TrainFront
                    size={17}
                    className="mr-2"
                  />

                  Rechercher les transports
                </>
              )}

            </button>

            <div className="mt-4 space-y-4">

              {transitJourneys.map(
                (
                  journey,
                  index
                ) => {
                  if (
                    selectedTransitIndex !==
                      null &&
                    selectedTransitIndex !==
                      index
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
                    segments.reduce(
                      (
                        total,
                        segment
                      ) =>
                        total +
                        segment.distanceMeters,
                      0
                    );

                  const departure =
                    formatTransitTime(
                      journey.departureDateTime
                    );

                  const arrival =
                    formatTransitTime(
                      journey.arrivalDateTime
                    );

                  return (
                    <article
                      key={index}
                      className="uf-card p-5"
                    >

                      {/* Résumé */}
                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <p className="uf-label text-secondary">
                            Itinéraire en transports
                          </p>

                          {departure &&
                            arrival && (
                              <p className="mt-1 text-lg font-bold text-secondary">
                                {departure}
                                {" → "}
                                {arrival}
                              </p>
                            )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">

                            <span className="flex items-center gap-1">

                              <Clock3
                                size={14}
                              />

                              {formatDuration(
                                journey.duration
                              )}

                            </span>

                            {distance >
                              0 && (
                              <span>
                                {formatDistance(
                                  distance
                                )}
                              </span>
                            )}

                            <span>
                              {journey.transfers ??
                                0}{" "}
                              {journey.transfers ===
                              1
                                ? "correspondance"
                                : "correspondances"}
                            </span>

                          </div>

                        </div>

                        {ecoPriority &&
                          index ===
                            0 && (
                            <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
                              Option écologique
                            </span>
                          )}

                      </div>

                      {/* Étapes détaillées */}
                      {(journey.sections
                        ?.length ??
                        0) >
                        0 && (
                        <div className="mt-6">

                          <p className="uf-caption mb-4 font-semibold uppercase tracking-wide text-muted">
                            Détail du trajet
                          </p>

                          <div>

                            {(
                              journey.sections ??
                              []
                            ).map(
                              (
                                section,
                                sectionIndex
                              ) => {
                                const Icon =
                                  getSectionIcon(
                                    section
                                  );

                                const label =
                                  getSectionLabel(
                                    section
                                  );

                                const isLast =
                                  sectionIndex ===
                                  (journey
                                    .sections
                                    ?.length ??
                                    0) -
                                    1;

                                const sectionMode =
                                  getTransitEmissionMode(
                                    section
                                  );

                                return (
                                  <div
                                    key={
                                      sectionIndex
                                    }
                                    className="flex gap-3"
                                  >

                                    {/* Timeline */}
                                    <div className="flex w-10 shrink-0 flex-col items-center">

                                      <div
                                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                          sectionMode ===
                                          "walking"
                                            ? "bg-background text-muted"
                                            : "bg-primary-soft text-primary"
                                        }`}
                                      >

                                        <Icon
                                          size={
                                            16
                                          }
                                        />

                                      </div>

                                      {!isLast && (
                                        <div className="my-1 min-h-[36px] w-px flex-1 bg-border" />
                                      )}

                                    </div>

                                    {/* Informations */}
                                    <div
                                      className={`min-w-0 flex-1 ${
                                        !isLast
                                          ? "pb-5"
                                          : ""
                                      }`}
                                    >

                                      <div className="flex items-start justify-between gap-3">

                                        <div className="min-w-0">

                                          <div className="flex flex-wrap items-center gap-2">

                                            <p className="uf-label text-secondary">
                                              {label}
                                            </p>

                                            {section.line &&
                                              sectionMode !==
                                                "walking" && (
                                                <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[11px] font-bold text-secondary">
                                                  {
                                                    section.line
                                                  }
                                                </span>
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

                                        </div>

                                        {Number(
                                          section.duration ??
                                            0
                                        ) >
                                          0 && (
                                          <span className="uf-caption shrink-0 font-medium text-muted">
                                            {formatDuration(
                                              Number(
                                                section.duration
                                              )
                                            )}
                                          </span>
                                        )}

                                      </div>

                                      {(section.from ||
                                        section.to) && (
                                        <div className="mt-2">

                                          {section.from && (
                                            <p className="uf-caption text-secondary">
                                              {
                                                section.from
                                              }
                                            </p>
                                          )}

                                          {section.from &&
                                            section.to && (
                                              <div className="my-1 ml-[3px] h-3 border-l border-dashed border-border" />
                                            )}

                                          {section.to && (
                                            <p className="uf-caption text-secondary">
                                              {
                                                section.to
                                              }
                                            </p>
                                          )}

                                        </div>
                                      )}

                                      {Number(
                                        section.distanceMeters ??
                                          0
                                      ) >
                                        0 && (
                                        <p className="uf-caption mt-2 text-subtle">
                                          {formatDistance(
                                            Number(
                                              section.distanceMeters
                                            )
                                          )}
                                        </p>
                                      )}

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )}

                      {/* CO2 / FLOWS */}
                      {(showCO2 ||
                        showFlows) && (
                        <div
                          className={`mt-5 grid gap-3 ${
                            showCO2 &&
                            showFlows
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >

                          {showCO2 && (
                            <div className="rounded-[16px] bg-primary-soft p-3">

                              <Leaf
                                size={16}
                                className="text-primary"
                              />

                              <p className="mt-2 font-bold text-primary">
                                {co2.co2SavedKg.toFixed(
                                  2
                                )}{" "}
                                kg
                              </p>

                              <p className="uf-caption text-muted">
                                CO₂ économisé
                              </p>

                            </div>
                          )}

                          {showFlows && (
                            <div className="rounded-[16px] bg-secondary-soft p-3">

                              <Sparkles
                                size={16}
                                className="text-secondary"
                              />

                              <p className="mt-2 font-bold text-secondary">
                                {
                                  co2.flowsPotential
                                }
                              </p>

                              <p className="uf-caption text-muted">
                                FLOWS potentiels
                              </p>

                            </div>
                          )}

                        </div>
                      )}

                      {journeyStatus ===
                        "idle" && (
                        <button
                          type="button"
                          disabled={
                            creatingJourney
                          }
                          onClick={() =>
                            chooseJourney(
                              index
                            )
                          }
                          className="uf-btn-primary mt-5"
                        >

                          {creatingJourney ? (
                            <>
                              <LoaderCircle
                                size={17}
                                className="mr-2 animate-spin"
                              />

                              Sélection...
                            </>
                          ) : (
                            "Choisir ce trajet"
                          )}

                        </button>
                      )}

                    </article>
                  );
                }
              )}

            </div>

          </section>
        )}

      {/* Trajet planifié */}
      {journeyStatus ===
        "planned" && (
          <section className="uf-card mt-5 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">

                <Check
                  size={18}
                />

              </div>

              <div>

                <p className="uf-label text-secondary">
                  Trajet sélectionné
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Vous pouvez maintenant démarrer votre déplacement.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                startJourney
              }
              disabled={
                startingJourney
              }
              className="uf-btn-primary mt-5"
            >

              {startingJourney ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="mr-2 animate-spin"
                  />

                  Démarrage...
                </>
              ) : (
                <>
                  <Navigation
                    size={17}
                    className="mr-2"
                  />

                  Démarrer le trajet
                </>
              )}

            </button>

            <button
  type="button"
  onClick={
    cancelSelectedJourney
  }
  className="uf-btn-secondary mt-3"
>

              <RefreshCcw
                size={16}
                className="mr-2"
              />

              Changer de trajet

            </button>

          </section>
        )}

      {/* En cours */}
      {journeyStatus ===
        "started" && (
          <section className="mt-5 rounded-[24px] bg-secondary p-5 text-white">

            <div className="flex items-center gap-3">

              <Navigation
                size={21}
              />

              <div>

                <p className="font-semibold">
                  Trajet en cours
                </p>

                <p className="mt-1 text-xs opacity-80">
                  Validez votre arrivée une fois à destination.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                completeJourney
              }
              disabled={
                completingJourney
              }
              className="mt-5 flex h-[52px] w-full items-center justify-center rounded-[16px] bg-white font-semibold text-secondary"
            >

              {completingJourney ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="mr-2 animate-spin"
                  />

                  Vérification...
                </>
              ) : (
                "Terminer le trajet"
              )}

            </button>

          </section>
        )}

      {/* Terminé */}
      {journeyStatus ===
        "completed" && (
          <section className="mt-5 rounded-[24px] bg-primary-soft p-5">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">

              <Check
                size={21}
              />

            </div>

            <h3 className="uf-h3 mt-4 text-secondary">
              Trajet terminé
            </h3>

            <p className="uf-body mt-2 text-muted">
              Votre arrivée a été validée.
            </p>

            {completionReward && (
              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="rounded-[16px] bg-white p-3">

                  <Leaf
                    size={16}
                    className="text-primary"
                  />

                  <p className="mt-2 font-bold text-primary">
                    {Number(
                      completionReward.co2_saved ??
                        0
                    ).toFixed(
                      2
                    )}{" "}
                    kg
                  </p>

                  <p className="uf-caption text-muted">
                    CO₂ économisé
                  </p>

                </div>

                <div className="rounded-[16px] bg-white p-3">

                  <Sparkles
                    size={16}
                    className="text-secondary"
                  />

                  <p className="mt-2 font-bold text-secondary">
                    {
                      completionReward.flows_earned ??
                      0
                    }
                  </p>

                  <p className="uf-caption text-muted">
                    FLOWS gagnés
                  </p>

                </div>

              </div>
            )}

          </section>
        )}

      {actionError && (
        <div className="mt-4 rounded-[16px] bg-error/10 p-4">

          <p className="uf-caption text-error">
            {actionError}
          </p>

        </div>
      )}

    </div>
  );
}