"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bike,
  Bus,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Footprints,
  Leaf,
  LoaderCircle,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrainFront,
  TramFront,
} from "lucide-react";

import UrbanFlowMap, {
  type JourneyCoordinates,
  type MapboxJourneyData,
  type MapboxTravelMode,
} from "@/components/map/UrbanFlowMap";

import {
  calculateCO2,
  type CO2Segment,
} from "@/lib/co2/calculateCO2";

import { canUseLocation } from "@/lib/privacy/location";
import { createClient } from "@/lib/supabase/client";

type JourneySettings = {
  default_transport_mode: ModeId;
  show_co2: boolean;
  show_flows: boolean;
  eco_priority: boolean;
  distance_unit: "km" | "m";
};

type ModeId =
  | "walking"
  | "cycling"
  | "driving"
  | "transit";

type TransitMode =
  | "metro"
  | "bus"
  | "tram"
  | "train";

type TransitSection = {
  type?: string | null;
  mode?: string | null;
  physicalMode?: string | null;
  commercialMode?: string | null;
  line?: string | null;
  lineName?: string | null;
  direction?: string | null;
  duration?: number;
  distanceMeters?: number;
  from?: string | null;
  to?: string | null;
};

type TransitJourney = {
  duration: number;
  departureDateTime?: string | null;
  arrivalDateTime?: string | null;
  transfers: number;
  walkingDuration: number;
  sections: TransitSection[];
};

const ALL_TRANSIT_MODES: TransitMode[] = [
  "metro",
  "bus",
  "tram",
  "train",
];

const mainModes = [
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
    icon: Bus,
  },
] satisfies {
  id: ModeId;
  label: string;
  icon: typeof Bike;
}[];

const transitFilters = [
  {
    id: "metro",
    label: "Métro",
    icon: TrainFront,
  },
  {
    id: "bus",
    label: "Bus",
    icon: Bus,
  },
  {
    id: "tram",
    label: "Tram",
    icon: TramFront,
  },
  {
    id: "train",
    label: "Train / RER",
    icon: TrainFront,
  },
] satisfies {
  id: TransitMode;
  label: string;
  icon: typeof Bus;
}[];

function isMapboxMode(
  mode: ModeId
): mode is MapboxTravelMode {
  return (
    mode === "walking" ||
    mode === "cycling" ||
    mode === "driving"
  );
}

function formatDuration(
  seconds: number
) {
  const minutes =
    Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remaining =
    minutes % 60;

  return remaining
    ? `${hours} h ${remaining} min`
    : `${hours} h`;
}

function formatDistance(
  meters: number
) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
}

function formatTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const match =
    value.match(
      /T(\d{2})(\d{2})/
    );

  if (!match) {
    return "—";
  }

  return `${match[1]}:${match[2]}`;
}

function formatCO2(
  value: number
) {
  if (value < 1) {
    return `${Math.round(
      value * 1000
    )} g`;
  }

  return `${value.toFixed(
    2
  )} kg`;
}

function normalize(
  value?: string | null
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function getMapboxModeLabel(
  mode: MapboxTravelMode
) {
  switch (mode) {
    case "walking":
      return "Marche";

    case "cycling":
      return "Vélo";

    case "driving":
      return "Voiture";
  }
}

function getMapboxIcon(
  mode: MapboxTravelMode
) {
  switch (mode) {
    case "walking":
      return Footprints;

    case "cycling":
      return Bike;

    case "driving":
      return Car;
  }
}

function getTransitModeFromSection(
  section: TransitSection
): TransitMode | null {
  const values =
    normalize(
      [
        section.mode,
        section.physicalMode,
        section.commercialMode,
        section.lineName,
        section.line,
      ]
        .filter(Boolean)
        .join(" ")
    );

  if (
    values.includes("metro")
  ) {
    return "metro";
  }

  if (
    values.includes("tram")
  ) {
    return "tram";
  }

  if (
    values.includes("bus")
  ) {
    return "bus";
  }

  if (
    values.includes("rer") ||
    values.includes("train") ||
    values.includes("rail") ||
    values.includes("transilien") ||
    values.includes("rapidtransit")
  ) {
    return "train";
  }

  return null;
}

function getTransitModeLabel(
  mode: TransitMode
) {
  switch (mode) {
    case "metro":
      return "Métro";

    case "bus":
      return "Bus";

    case "tram":
      return "Tram";

    case "train":
      return "Train / RER";
  }
}

function getTransitIcon(
  mode: TransitMode
) {
  switch (mode) {
    case "bus":
      return Bus;

    case "tram":
      return TramFront;

    default:
      return TrainFront;
  }
}

function getJourneyTransportModes(
  journey: TransitJourney
) {
  const modes =
    journey.sections
      .map(
        getTransitModeFromSection
      )
      .filter(
        (
          mode
        ): mode is TransitMode =>
          mode !== null
      );

  return [
    ...new Set(modes),
  ].join(",") || "transit";
}

function getSectionPresentation(
  section: TransitSection
) {
  const type =
    normalize(section.type);

  const mode =
    normalize(section.mode);

  if (
    type.includes(
      "street_network"
    ) ||
    mode.includes(
      "walking"
    )
  ) {
    return {
      title:
        section.duration
          ? `${formatDuration(
              section.duration
            )} à pied`
          : "Marche",

      subtitle:
        section.to
          ? `Marcher jusqu'à ${section.to}`
          : "Continuer à pied",

      icon:
        Footprints,
    };
  }

  if (
    type.includes(
      "waiting"
    ) ||
    mode.includes(
      "waiting"
    )
  ) {
    return {
      title:
        section.duration
          ? `Correspondance · ${formatDuration(
              section.duration
            )}`
          : "Correspondance",

      subtitle:
        "Temps d'attente",

      icon:
        Clock,
    };
  }

  if (
    type.includes(
      "transfer"
    )
  ) {
    return {
      title:
        section.duration
          ? `Correspondance · ${formatDuration(
              section.duration
            )}`
          : "Correspondance",

      subtitle:
        section.to
          ? `Rejoindre ${section.to}`
          : "Changer de ligne",

      icon:
        Footprints,
    };
  }

  const transitMode =
    getTransitModeFromSection(
      section
    );

  if (transitMode) {
    const Icon =
      getTransitIcon(
        transitMode
      );

    return {
      title:
        `${getTransitModeLabel(
          transitMode
        )}${
          section.line
            ? ` ${section.line}`
            : ""
        }`,

      subtitle:
        section.direction
          ? `Direction ${section.direction}`
          : section.to
            ? `Jusqu'à ${section.to}`
            : "",

      icon:
        Icon,
    };
  }

  return {
    title:
      "Déplacement",

    subtitle:
      section.to
        ? `Jusqu'à ${section.to}`
        : "",

    icon:
      MapPin,
  };
}

function buildTransitCO2Segments(
  journey: TransitJourney
): CO2Segment[] {
  const segments: CO2Segment[] =
    [];

  for (
    const section of journey.sections
  ) {
    const distance =
      section.distanceMeters ??
      0;

    if (distance <= 0) {
      continue;
    }

    const type =
      normalize(section.type);

    const mode =
      normalize(section.mode);

    if (
      type.includes(
        "street_network"
      ) ||
      mode.includes(
        "walking"
      )
    ) {
      segments.push({
        mode: "walking",
        distanceMeters:
          distance,
      });

      continue;
    }

    const transitMode =
      getTransitModeFromSection(
        section
      );

    if (
      transitMode
    ) {
      segments.push({
        mode:
          transitMode,
        distanceMeters:
          distance,
      });
    }
  }

  return segments;
}

export default function JourneyPlanner() {
  const [
    selectedMode,
    setSelectedMode,
  ] = useState<ModeId>("walking");
  
  const [
    showCO2,
    setShowCO2,
  ] = useState(true);
  
  const [
    showFlows,
    setShowFlows,
  ] = useState(true);
  
  const [
    ecoPriority,
    setEcoPriority,
  ] = useState(false);
  
  const [
    distanceUnit,
    setDistanceUnit,
  ] = useState<"km" | "m">("km");
  
  const [
    settingsLoaded,
    setSettingsLoaded,
  ] = useState(false);

  useEffect(() => {
    async function loadJourneySettings() {
      const supabase =
        createClient();
  
      const {
        data: { user },
      } =
        await supabase.auth.getUser();
  
      if (!user) {
        setSettingsLoaded(true);
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
          .eq("id", user.id)
          .single();
  
      if (error) {
        console.error(
          "Erreur chargement paramètres trajet :",
          error
        );
  
        setSettingsLoaded(true);
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
        setSelectedMode(mode);
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
  
      setSettingsLoaded(true);
    }
  
    loadJourneySettings();
  }, []);

  const [
    coordinates,
    setCoordinates,
  ] =
    useState<JourneyCoordinates>({
      origin: null,
      destination: null,
    });

  const [
    mapboxJourney,
    setMapboxJourney,
  ] =
    useState<MapboxJourneyData | null>(
      null
    );

  const [
    selectedTransitModes,
    setSelectedTransitModes,
  ] =
    useState<TransitMode[]>(
      ALL_TRANSIT_MODES
    );

  const [
    transitJourneys,
    setTransitJourneys,
  ] =
    useState<TransitJourney[]>(
      []
    );

  const [
    transitLoading,
    setTransitLoading,
  ] =
    useState(false);

  const [
    transitError,
    setTransitError,
  ] =
    useState("");

  const [
    selectedJourneyIndex,
    setSelectedJourneyIndex,
  ] =
    useState<number | null>(
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
    choosingJourney,
    setChoosingJourney,
  ] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] =
    useState("");

  const [
    journeyStarted,
    setJourneyStarted,
  ] =
    useState(false);

  const [
    startingJourney,
    setStartingJourney,
  ] =
    useState(false);

  const [
    journeyCompleted,
    setJourneyCompleted,
  ] =
    useState(false);

  const [
    completingJourney,
    setCompletingJourney,
  ] =
    useState(false);

  const handleCoordinatesChange =
    useCallback(
      (
        nextCoordinates: JourneyCoordinates
      ) => {
        setCoordinates(
          nextCoordinates
        );
      },
      []
    );

  const handleMapboxRouteChange =
    useCallback(
      (
        route: MapboxJourneyData | null
      ) => {
        setMapboxJourney(
          route
        );
      },
      []
    );

  const mapMode =
    isMapboxMode(
      selectedMode
    )
      ? selectedMode
      : null;

  const allTransitSelected =
    selectedTransitModes.length ===
    ALL_TRANSIT_MODES.length;

  const mapboxCO2 =
    useMemo(() => {
      if (
        !mapboxJourney
      ) {
        return null;
      }

      return calculateCO2([
        {
          mode:
            mapboxJourney.mode,
          distanceMeters:
            mapboxJourney.distance,
        },
      ]);
    }, [
      mapboxJourney,
    ]);

  function resetJourneySelection() {
    if (
      journeyStarted
    ) {
      return;
    }

    setSelectedJourneyId(
      null
    );

    setSelectedJourneyIndex(
      null
    );

    setActionError(
      ""
    );

    setJourneyStarted(
      false
    );

    setJourneyCompleted(
      false
    );
  }

  function toggleTransitMode(
    mode: TransitMode
  ) {
    if (
      selectedJourneyId
    ) {
      return;
    }

    setSelectedTransitModes(
      (current) => {
        if (
          current.includes(
            mode
          )
        ) {
          if (
            current.length ===
            1
          ) {
            return current;
          }

          return current.filter(
            (item) =>
              item !== mode
          );
        }

        return [
          ...current,
          mode,
        ];
      }
    );
  }

  function selectAllTransitModes() {
    if (
      selectedJourneyId
    ) {
      return;
    }

    setSelectedTransitModes(
      ALL_TRANSIT_MODES
    );
  }

  async function createJourney(
    data: {
      transportMode: string;
      duration: number;
      distance?: number | null;
      tripCO2Kg?: number;
      referenceCarCO2Kg?: number;
      co2SavedKg?: number;
      flowsPotential?: number;
    }
  ) {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      throw new Error(
        "Coordonnées du trajet incomplètes."
      );
    }

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
                data.transportMode,

              originName:
                "Ma position",

              destinationName:
                "Destination",

              originLng:
                coordinates
                  .origin[0],

              originLat:
                coordinates
                  .origin[1],

              destinationLng:
                coordinates
                  .destination[0],

              destinationLat:
                coordinates
                  .destination[1],

              estimatedDurationSeconds:
                data.duration,

              distanceMeters:
                data.distance ??
                null,

              tripCO2:
                data.tripCO2Kg ??
                0,

              referenceCarCO2:
                data.referenceCarCO2Kg ??
                0,

              co2Saved:
                data.co2SavedKg ??
                0,

              flowsPotential:
                data.flowsPotential ??
                0,
            }),
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ??
          "Impossible d'enregistrer le trajet."
      );
    }

    return result.journey.id as string;
  }

  async function chooseMapboxJourney() {
    if (
      !mapboxJourney ||
      !mapboxCO2
    ) {
      return;
    }

    setChoosingJourney(
      true
    );

    setActionError(
      ""
    );

    try {
      const id =
        await createJourney({
          transportMode:
            mapboxJourney.mode,

          duration:
            mapboxJourney.duration,

          distance:
            mapboxJourney.distance,

          tripCO2Kg:
            mapboxCO2.tripCO2Kg,

          referenceCarCO2Kg:
            mapboxCO2.referenceCarCO2Kg,

          co2SavedKg:
            mapboxCO2.co2SavedKg,

          flowsPotential:
            mapboxCO2.flowsPotential,
        });

      setSelectedJourneyId(
        id
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de choisir ce trajet."
      );
    } finally {
      setChoosingJourney(
        false
      );
    }
  }

  async function chooseTransitJourney(
    journey: TransitJourney,
    index: number
  ) {
    setChoosingJourney(
      true
    );

    setActionError(
      ""
    );

    try {
      const segments =
        buildTransitCO2Segments(
          journey
        );

      const co2 =
        calculateCO2(
          segments
        );

      const totalDistance =
        segments.reduce(
          (
            total,
            segment
          ) =>
            total +
            segment.distanceMeters,
          0
        );

      const id =
        await createJourney({
          transportMode:
            getJourneyTransportModes(
              journey
            ),

          duration:
            journey.duration,

          distance:
            totalDistance,

          tripCO2Kg:
            co2.tripCO2Kg,

          referenceCarCO2Kg:
            co2.referenceCarCO2Kg,

          co2SavedKg:
            co2.co2SavedKg,

          flowsPotential:
            co2.flowsPotential,
        });

      setSelectedJourneyId(
        id
      );

      setSelectedJourneyIndex(
        index
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de choisir ce trajet."
      );
    } finally {
      setChoosingJourney(
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

    setStartingJourney(
      true
    );

    setActionError(
      ""
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
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
                    latitude:
                      position.coords
                        .latitude,

                    longitude:
                      position.coords
                        .longitude,
                  }),
              }
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error
            );
          }

          setJourneyStarted(
            true
          );
        } catch (error) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Impossible de démarrer."
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
          false,

        timeout:
          20000,

        maximumAge:
          30000,
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

    setCompletingJourney(
      true
    );

    setActionError(
      ""
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
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
                    latitude:
                      position.coords
                        .latitude,

                    longitude:
                      position.coords
                        .longitude,
                  }),
              }
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error
            );
          }

          setJourneyCompleted(
            true
          );
        } catch (error) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Impossible de terminer."
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
          false,

        timeout:
          20000,

        maximumAge:
          30000,
      }
    );
  }

  async function loadTransitJourneys() {
    if (
      !coordinates.origin ||
      !coordinates.destination
    ) {
      return;
    }

    setTransitLoading(
      true
    );

    setTransitError(
      ""
    );

    try {
      const from =
        `${coordinates.origin[0]};${coordinates.origin[1]}`;

      const to =
        `${coordinates.destination[0]};${coordinates.destination[1]}`;

      const modes =
        selectedTransitModes.join(
          ","
        );

      const response =
        await fetch(
          `/api/journeys/public-transport?from=${encodeURIComponent(
            from
          )}&to=${encodeURIComponent(
            to
          )}&modes=${encodeURIComponent(
            modes
          )}`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error
        );
      }

      const normalized: TransitJourney[] =
        (
          result.journeys ??
          []
        ).map(
          (journey: any) => ({
            duration:
              journey.duration ??
              0,

            departureDateTime:
              journey.departureDateTime ??
              null,

            arrivalDateTime:
              journey.arrivalDateTime ??
              null,

            transfers:
              journey.transfers ??
              0,

            walkingDuration:
              journey.walkingDuration ??
              0,

            sections:
              (
                journey.sections ??
                []
              ).map(
                (
                  section: any
                ) => ({
                  type:
                    section.type ??
                    null,

                  mode:
                    section.mode ??
                    null,

                  physicalMode:
                    section.physicalMode ??
                    null,

                  commercialMode:
                    section.commercialMode ??
                    null,

                  line:
                    section.line ??
                    null,

                  lineName:
                    section.lineName ??
                    null,

                  direction:
                    section.direction ??
                    null,

                  duration:
                    section.duration ??
                    0,

                  distanceMeters:
                    section.distanceMeters ??
                    0,

                  from:
                    section.from ??
                    null,

                  to:
                    section.to ??
                    null,
                })
              ),
          })
        );

      setTransitJourneys(
        normalized.slice(
          0,
          4
        )
      );

      setSelectedJourneyId(
        null
      );

      setSelectedJourneyIndex(
        null
      );
    } catch (error) {
      setTransitError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les transports."
      );
    } finally {
      setTransitLoading(
        false
      );
    }
  }

  useEffect(() => {
    if (
      selectedMode !==
        "transit" ||
      !coordinates.origin ||
      !coordinates.destination ||
      selectedJourneyId
    ) {
      return;
    }

    loadTransitJourneys();
  }, [
    selectedMode,
    coordinates.origin,
    coordinates.destination,
    selectedTransitModes,
  ]);

  function handleModeChange(
    mode: ModeId
  ) {
    if (
      journeyStarted
    ) {
      return;
    }

    setSelectedMode(
      mode
    );

    resetJourneySelection();

    setActionError(
      ""
    );
  }

  const visibleTransitJourneys =
    transitJourneys
      .map(
        (
          journey,
          originalIndex
        ) => ({
          journey,
          originalIndex,
        })
      )
      .filter(
        ({
          originalIndex,
        }) =>
          selectedJourneyIndex ===
            null ||
          selectedJourneyIndex ===
            originalIndex
      );

  return (
    <>
      <section className="mt-6">
        <h2 className="uf-label text-secondary">
          Mode de transport
        </h2>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {mainModes.map(
            ({
              id,
              label,
              icon: Icon,
            }) => (
              <button
                key={id}
                type="button"
                disabled={
                  journeyStarted
                }
                onClick={() =>
                  handleModeChange(
                    id
                  )
                }
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 transition disabled:opacity-50 ${
                  selectedMode ===
                  id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-secondary"
                }`}
              >
                <Icon
                  size={16}
                />

                <span className="uf-caption">
                  {label}
                </span>
              </button>
            )
          )}
        </div>
      </section>

      {selectedMode ===
        "transit" &&
        !selectedJourneyId && (
          <section className="mt-4">

            <div className="mb-3 flex items-center gap-2">

              <SlidersHorizontal
                size={16}
              />

              <p className="uf-label text-secondary">
                Transports autorisés
              </p>

            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">

              <button
                type="button"
                onClick={
                  selectAllTransitModes
                }
                className={`shrink-0 rounded-full border px-4 py-2 ${
                  allTransitSelected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-white text-muted"
                }`}
              >
                Tous
              </button>

              {transitFilters.map(
                ({
                  id,
                  label,
                  icon: Icon,
                }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      toggleTransitMode(
                        id
                      )
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 ${
                      selectedTransitModes.includes(
                        id
                      )
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-white text-muted"
                    }`}
                  >
                    <Icon
                      size={14}
                    />

                    {label}
                  </button>
                )
              )}

            </div>

          </section>
        )}

      <section className="mt-5">

        <div className="h-[520px] overflow-hidden rounded-[24px] border border-border">

          <UrbanFlowMap
            mode={
              mapMode
            }
            onCoordinatesChange={
              handleCoordinatesChange
            }
            onRouteChange={
              handleMapboxRouteChange
            }
          />

        </div>

      </section>

      {isMapboxMode(
        selectedMode
      ) &&
        mapboxJourney &&
        mapboxCO2 && (
          <section className="mt-5">

            <div className="uf-card overflow-hidden">

              <div className="p-5">

                <div className="flex items-center gap-3">

                  {(() => {
                    const Icon =
                      getMapboxIcon(
                        selectedMode
                      );

                    return (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon
                          size={20}
                        />
                      </div>
                    );
                  })()}

                  <div className="flex-1">

                    <p className="uf-h3 text-secondary">
                      {getMapboxModeLabel(
                        selectedMode
                      )}
                    </p>

                    <p className="uf-caption mt-1 text-muted">
                      Itinéraire recommandé
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-[16px] bg-background p-3">

                    <p className="uf-caption text-muted">
                      Durée
                    </p>

                    <p className="uf-label mt-1 text-secondary">
                      {formatDuration(
                        mapboxJourney.duration
                      )}
                    </p>

                  </div>

                  <div className="rounded-[16px] bg-background p-3">

                    <p className="uf-caption text-muted">
                      Distance
                    </p>

                    <p className="uf-label mt-1 text-secondary">
                      {formatDistance(
                        mapboxJourney.distance
                      )}
                    </p>

                  </div>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">

                  <div className="rounded-[16px] bg-primary-soft p-3">

                    <div className="flex items-center gap-1.5 text-primary">

                      <Leaf
                        size={15}
                      />

                      <p className="uf-caption">
                        CO₂ économisé
                      </p>

                    </div>

                    <p className="uf-label mt-1 text-primary">
                      {formatCO2(
                        mapboxCO2.co2SavedKg
                      )}
                    </p>

                  </div>

                  <div className="rounded-[16px] bg-secondary-soft p-3">

                    <div className="flex items-center gap-1.5 text-secondary">

                      <Sparkles
                        size={15}
                      />

                      <p className="uf-caption">
                        FLOWS potentiels
                      </p>

                    </div>

                    <p className="uf-label mt-1 text-secondary">
                      +
                      {
                        mapboxCO2.flowsPotential
                      }
                    </p>

                  </div>

                </div>

              </div>

              {!selectedJourneyId && (
                <div className="border-t border-border p-4">

                  <button
                    type="button"
                    onClick={
                      chooseMapboxJourney
                    }
                    disabled={
                      choosingJourney
                    }
                    className="uf-btn-primary flex w-full items-center justify-center gap-2"
                  >

                    {choosingJourney ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />

                        Enregistrement...
                      </>
                    ) : (
                      "Choisir ce trajet"
                    )}

                  </button>

                </div>
              )}

              {selectedJourneyId && (
                <div className="border-t border-border p-4">

                  <div className="flex items-center justify-center gap-2 rounded-[14px] bg-primary-soft px-4 py-3 text-primary">

                    <CheckCircle2
                      size={18}
                    />

                    <span className="uf-label">
                      Trajet choisi
                    </span>

                  </div>

                </div>
              )}

            </div>

          </section>
        )}

      {selectedMode ===
        "transit" &&
        coordinates.destination && (
          <section className="mt-5">

            <h2 className="uf-h3 text-secondary">
              {selectedJourneyId
                ? "Votre trajet"
                : "Itinéraires proposés"}
            </h2>

            {!selectedJourneyId && (
              <p className="uf-caption mt-1 text-muted">
                Les meilleures options selon vos filtres
              </p>
            )}

            {transitLoading && (
              <div className="uf-card mt-4 flex justify-center gap-2 p-6">

                <LoaderCircle
                  className="animate-spin"
                  size={18}
                />

                Recherche...
              </div>
            )}

            <div className="mt-4 space-y-4">

              {visibleTransitJourneys.map(
                ({
                  journey,
                  originalIndex,
                }) => {
                  const segments =
                    buildTransitCO2Segments(
                      journey
                    );

                  const co2 =
                    calculateCO2(
                      segments
                    );

                  const totalDistance =
                    segments.reduce(
                      (
                        total,
                        segment
                      ) =>
                        total +
                        segment.distanceMeters,
                      0
                    );

                  return (
                    <article
                      key={
                        originalIndex
                      }
                      className="uf-card overflow-hidden"
                    >

                      <div className="p-4">

                        {originalIndex ===
                          0 && (
                          <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                            Trajet recommandé
                          </span>
                        )}

                        <div className="mt-3 flex justify-between">

                          <div>
                            <p className="uf-caption text-muted">
                              {journey.transfers ===
                              0
                                ? "Sans correspondance"
                                : `${journey.transfers} correspondance(s)`}
                            </p>
                          </div>

                          <div className="text-right">

                            <p className="uf-h3 text-secondary">
                              {formatDuration(
                                journey.duration
                              )}
                            </p>

                            <p className="uf-caption text-muted">
                              {formatTime(
                                journey.departureDateTime
                              )}{" "}
                              →{" "}
                              {formatTime(
                                journey.arrivalDateTime
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">

                          <div className="rounded-[14px] bg-background p-3">

                            <p className="uf-caption text-muted">
                              Distance
                            </p>

                            <p className="uf-label mt-1 text-secondary">
                              {formatDistance(
                                totalDistance
                              )}
                            </p>

                          </div>

                          <div className="rounded-[14px] bg-primary-soft p-3">

                            <p className="uf-caption text-primary">
                              CO₂ évité
                            </p>

                            <p className="uf-label mt-1 text-primary">
                              {formatCO2(
                                co2.co2SavedKg
                              )}
                            </p>

                          </div>

                          <div className="rounded-[14px] bg-secondary-soft p-3">

                            <p className="uf-caption text-secondary">
                              FLOWS
                            </p>

                            <p className="uf-label mt-1 text-secondary">
                              +
                              {
                                co2.flowsPotential
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                      <div className="border-t border-border p-4">

                        {journey.sections.map(
                          (
                            section,
                            index
                          ) => {
                            const presentation =
                              getSectionPresentation(
                                section
                              );

                            const Icon =
                              presentation.icon;

                            return (
                              <div
                                key={
                                  index
                                }
                                className="mb-4 flex gap-3 last:mb-0"
                              >

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                                  <Icon
                                    size={16}
                                  />
                                </div>

                                <div>

                                  <p className="uf-label text-secondary">
                                    {
                                      presentation.title
                                    }
                                  </p>

                                  <p className="uf-caption mt-1 text-muted">
                                    {
                                      presentation.subtitle
                                    }
                                  </p>

                                  {!!section.distanceMeters && (
                                    <p className="uf-caption mt-1 text-subtle">
                                      {formatDistance(
                                        section.distanceMeters
                                      )}
                                    </p>
                                  )}

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                      {!selectedJourneyId && (
                        <div className="border-t border-border p-4">

                          <button
                            type="button"
                            disabled={
                              choosingJourney
                            }
                            onClick={() =>
                              chooseTransitJourney(
                                journey,
                                originalIndex
                              )
                            }
                            className="uf-btn-primary w-full"
                          >
                            Choisir ce trajet
                          </button>

                        </div>
                      )}

                      {selectedJourneyIndex ===
                        originalIndex &&
                        selectedJourneyId && (
                          <div className="border-t border-border p-4">

                            <div className="flex justify-center gap-2 rounded-[14px] bg-primary-soft px-4 py-3 text-primary">

                              <CheckCircle2
                                size={18}
                              />

                              Trajet choisi

                            </div>

                          </div>
                        )}

                    </article>
                  );
                }
              )}

            </div>

            {transitError && (
              <p className="mt-3 text-sm text-error">
                {
                  transitError
                }
              </p>
            )}

          </section>
        )}

      {selectedJourneyId && (
        <section className="mt-4">

          <div className="uf-card p-4">

            {!journeyStarted ? (
              <>
                <p className="uf-label text-secondary">
                  Trajet prêt
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Démarrez lorsque vous êtes prêt à partir.
                </p>

                <button
                  type="button"
                  onClick={
                    startJourney
                  }
                  disabled={
                    startingJourney
                  }
                  className="uf-btn-primary mt-4 flex w-full justify-center gap-2"
                >
                  {startingJourney ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Démarrage...
                    </>
                  ) : (
                    <>
                      <MapPin
                        size={17}
                      />
                      Démarrer le trajet
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={
                    resetJourneySelection
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-border bg-white px-4 py-3 text-sm font-medium text-secondary"
                >
                  <RotateCcw
                    size={16}
                  />

                  Changer de trajet
                </button>
              </>
            ) : !journeyCompleted ? (
              <>
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                    <Check
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="uf-label text-secondary">
                      Trajet en cours
                    </p>

                    <p className="uf-caption mt-1 text-muted">
                      Votre départ a été enregistré.
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
                  className="uf-btn-primary mt-4 flex w-full justify-center gap-2"
                >
                  {completingJourney ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />
                      Terminer le trajet
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <CheckCircle2
                    size={18}
                  />
                </div>

                <div>
                  <p className="uf-label text-secondary">
                    Trajet terminé
                  </p>

                  <p className="uf-caption mt-1 text-muted">
                    Votre arrivée a été validée.
                  </p>
                </div>

              </div>
            )}

            {actionError && (
              <p className="uf-caption mt-3 text-error">
                {
                  actionError
                }
              </p>
            )}

          </div>

        </section>
      )}
    </>
  );
}