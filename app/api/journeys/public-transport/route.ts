import {
  NextRequest,
  NextResponse,
} from "next/server";

type TransitMode =
  | "all"
  | "metro"
  | "bus"
  | "tram"
  | "train";

type Coordinates = {
  lat: number;
  lng: number;
};

type RequestBody = {
  origin: Coordinates;
  destination: Coordinates;
  mode?: TransitMode;
};

function toRadians(
  value: number
) {
  return (
    value *
    Math.PI /
    180
  );
}

function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadius =
    6_371_000;

  const dLat =
    toRadians(
      lat2 - lat1
    );

  const dLng =
    toRadians(
      lng2 - lng1
    );

  const a =
    Math.sin(
      dLat / 2
    ) ** 2 +
    Math.cos(
      toRadians(
        lat1
      )
    ) *
      Math.cos(
        toRadians(
          lat2
        )
      ) *
      Math.sin(
        dLng / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    );

  return (
    earthRadius *
    c
  );
}

function normalizeSection(
  section: any
) {
  let distanceMeters = 0;

  if (
    typeof section.length ===
    "number"
  ) {
    distanceMeters =
      section.length;
  } else if (
    typeof section
      .street_network
      ?.length ===
    "number"
  ) {
    distanceMeters =
      section.street_network.length;
  } else {
    const fromLat =
      Number(
        section.from
          ?.stop_point
          ?.coord?.lat ??
          section.from
            ?.coord?.lat
      );

    const fromLng =
      Number(
        section.from
          ?.stop_point
          ?.coord?.lon ??
          section.from
            ?.coord?.lon
      );

    const toLat =
      Number(
        section.to
          ?.stop_point
          ?.coord?.lat ??
          section.to
            ?.coord?.lat
      );

    const toLng =
      Number(
        section.to
          ?.stop_point
          ?.coord?.lon ??
          section.to
            ?.coord?.lon
      );

    if (
      Number.isFinite(
        fromLat
      ) &&
      Number.isFinite(
        fromLng
      ) &&
      Number.isFinite(
        toLat
      ) &&
      Number.isFinite(
        toLng
      )
    ) {
      distanceMeters =
        calculateDistanceMeters(
          fromLat,
          fromLng,
          toLat,
          toLng
        );
    }
  }

  return {
    type:
      section.type ??
      null,

    mode:
      section.mode ??
      section
        .street_network
        ?.mode ??
      null,

    physicalMode:
      section
        .display_informations
        ?.physical_mode ??
      null,

    commercialMode:
      section
        .display_informations
        ?.commercial_mode ??
      null,

    line:
      section
        .display_informations
        ?.code ??
      null,

    lineName:
      section
        .display_informations
        ?.name ??
      null,

    direction:
      section
        .display_informations
        ?.direction ??
      null,

    duration:
      Number(
        section.duration ??
          0
      ),

    distanceMeters:
      Math.round(
        distanceMeters
      ),

    from:
      section.from
        ?.name ??
      null,

    to:
      section.to
        ?.name ??
      null,
  };
}

function normalizeJourney(
  journey: any
) {
  return {
    duration:
      Number(
        journey.duration ??
          0
      ),

    departureDateTime:
      journey.departure_date_time ??
      null,

    arrivalDateTime:
      journey.arrival_date_time ??
      null,

    transfers:
      Number(
        journey.nb_transfers ??
          0
      ),

    walkingDuration:
      Number(
        journey.durations
          ?.walking ??
          0
      ),

    sections:
      Array.isArray(
        journey.sections
      )
        ? journey.sections.map(
            normalizeSection
          )
        : [],
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const apiKey =
      process.env.IDFM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "La clé API Île-de-France Mobilités est manquante.",
        },
        {
          status: 500,
        }
      );
    }

    let body: RequestBody;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Corps de requête invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      origin,
      destination,
      mode = "all",
    } = body;

    if (
      typeof origin?.lat !==
        "number" ||
      typeof origin?.lng !==
        "number" ||
      typeof destination?.lat !==
        "number" ||
      typeof destination?.lng !==
        "number"
    ) {
      return NextResponse.json(
        {
          error:
            "Coordonnées de départ ou de destination invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const url =
      new URL(
        "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys"
      );

    url.searchParams.set(
      "from",
      `${origin.lng};${origin.lat}`
    );

    url.searchParams.set(
      "to",
      `${destination.lng};${destination.lat}`
    );

    /*
     * On laisse PRIM/Navitia
     * calculer tous les modes
     * lorsqu'on est sur "all".
     *
     * Le filtrage précis des modes
     * peut rester géré par ton
     * fonctionnement existant.
     */
    if (mode !== "all") {
      url.searchParams.set(
        "first_section_mode[]",
        "walking"
      );

      url.searchParams.set(
        "last_section_mode[]",
        "walking"
      );

      if (mode === "metro") {
        url.searchParams.append(
          "allowed_id[]",
          "physical_mode:Metro"
        );
      }

      if (mode === "bus") {
        url.searchParams.append(
          "allowed_id[]",
          "physical_mode:Bus"
        );
      }

      if (mode === "tram") {
        url.searchParams.append(
          "allowed_id[]",
          "physical_mode:Tramway"
        );
      }

      if (mode === "train") {
        url.searchParams.append(
          "allowed_id[]",
          "physical_mode:Train"
        );
      }
    }

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            apikey:
              apiKey,
          },

          cache:
            "no-store",
        }
      );

    const raw =
      await response.text();

    if (!raw) {
      console.error(
        "Réponse PRIM vide :",
        response.status
      );

      return NextResponse.json(
        {
          error:
            `Île-de-France Mobilités a renvoyé une réponse vide (${response.status}).`,
        },
        {
          status:
            response.ok
              ? 502
              : response.status,
        }
      );
    }

    let data: any;

    try {
      data =
        JSON.parse(raw);
    } catch {
      console.error(
        "Réponse PRIM non JSON :",
        raw
      );

      return NextResponse.json(
        {
          error:
            "La réponse du service Île-de-France Mobilités est invalide.",
        },
        {
          status: 502,
        }
      );
    }

    if (!response.ok) {
      console.error(
        "Erreur PRIM :",
        response.status,
        data
      );

      return NextResponse.json(
        {
          error:
            data?.message ??
            data?.error?.message ??
            "Erreur du service Île-de-France Mobilités.",
        },
        {
          status:
            response.status,
        }
      );
    }

    const journeys =
      Array.isArray(
        data.journeys
      )
        ? data.journeys.map(
            normalizeJourney
          )
        : [];

    return NextResponse.json(
      {
        journeys,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erreur API transports :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les transports en commun.",
      },
      {
        status: 500,
      }
    );
  }
}