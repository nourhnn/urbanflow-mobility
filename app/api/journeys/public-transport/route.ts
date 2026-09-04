import { NextRequest, NextResponse } from "next/server";

type TransitMode =
  | "metro"
  | "bus"
  | "tram"
  | "train";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getSectionTransitMode(
  section: any
): TransitMode | null {
  const display =
    section.display_informations;

  const values = normalize(
    [
      display?.physical_mode,
      display?.commercial_mode,
      display?.name,
      display?.label,
      display?.code,
      section.mode,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (values.includes("metro")) {
    return "metro";
  }

  if (
    values.includes("tram") ||
    values.includes("tramway")
  ) {
    return "tram";
  }

  if (
    values.includes("bus") ||
    values.includes("coach")
  ) {
    return "bus";
  }

  if (
    values.includes("rer") ||
    values.includes("train") ||
    values.includes("rail") ||
    values.includes("transilien") ||
    values.includes("rapid transit") ||
    values.includes("rapidtransit")
  ) {
    return "train";
  }

  return null;
}

function journeyMatchesModes(
  journey: any,
  allowedModes: TransitMode[]
) {
  if (allowedModes.length === 0) {
    return true;
  }

  const sections =
    journey.sections ?? [];

  const transitModes =
    sections
      .map(
        (
          section: any
        ) =>
          getSectionTransitMode(
            section
          )
      )
      .filter(
        (
          mode: TransitMode | null
        ): mode is TransitMode =>
          mode !== null
      );

  if (
    transitModes.length === 0
  ) {
    return false;
  }

  return transitModes.every(
    (mode) =>
      allowedModes.includes(mode)
  );
}

export async function GET(
  request: NextRequest
) {
  const apiKey =
    process.env.IDFM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Clé API IDFM manquante.",
      },
      {
        status: 500,
      }
    );
  }

  const searchParams =
    request.nextUrl.searchParams;

  const from =
    searchParams.get("from");

  const to =
    searchParams.get("to");

  const modesParam =
    searchParams.get("modes");

  if (!from || !to) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Les paramètres from et to sont obligatoires.",
      },
      {
        status: 400,
      }
    );
  }

  const validModes: TransitMode[] =
    [
      "metro",
      "bus",
      "tram",
      "train",
    ];

  let allowedModes: TransitMode[] =
    [...validModes];

  if (modesParam) {
    allowedModes =
      modesParam
        .split(",")
        .filter(
          (
            mode
          ): mode is TransitMode =>
            validModes.includes(
              mode as TransitMode
            )
        );
  }

  const params =
    new URLSearchParams({
      from,
      to,
      count: "20",
    });

  const url =
    `https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys?${params.toString()}`;

  try {
    const response =
      await fetch(url, {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          apikey:
            apiKey,
        },

        cache:
          "no-store",
      });

    const raw =
      await response.text();

    let data: any;

    try {
      data =
        JSON.parse(raw);
    } catch {
      data = raw;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Erreur lors de l'appel à Île-de-France Mobilités.",

          primStatus:
            response.status,

          details:
            data,
        },
        {
          status: 502,
        }
      );
    }

    const journeys =
      data?.journeys ?? [];

    const filteredJourneys =
      journeys.filter(
        (journey: any) =>
          journeyMatchesModes(
            journey,
            allowedModes
          )
      );

    /*
     * On normalise ici les données utiles
     * pour UrbanFlow.
     */
    const normalizedJourneys =
      filteredJourneys.map(
        (journey: any) => ({
          duration:
            journey.duration ?? 0,

          departureDateTime:
            journey.departure_date_time ??
            null,

          arrivalDateTime:
            journey.arrival_date_time ??
            null,

          transfers:
            journey.nb_transfers ?? 0,

          walkingDuration:
            journey.durations?.walking ??
            0,

          sections:
            (
              journey.sections ??
              []
            ).map(
              (
                section: any
              ) => {
                const display =
                  section.display_informations;

                return {
                  type:
                    section.type ??
                    null,

                  mode:
                    section.mode ??
                    null,

                  physicalMode:
                    display?.physical_mode ??
                    null,

                  commercialMode:
                    display?.commercial_mode ??
                    null,

                  line:
                    display?.label ??
                    display?.code ??
                    null,

                  lineName:
                    display?.name ??
                    null,

                  direction:
                    display?.direction ??
                    null,

                  duration:
                    section.duration ??
                    0,

                  /*
                   * Distance de la section.
                   *
                   * Navitia renvoie selon les
                   * sections length et/ou
                   * street_network.length.
                   */
                  distanceMeters:
                    typeof section.length ===
                    "number"
                      ? section.length
                      : typeof section
                            .street_network
                            ?.length ===
                          "number"
                        ? section
                            .street_network
                            .length
                        : 0,

                  from:
                    section.from?.name ??
                    section.from
                      ?.stop_point
                      ?.name ??
                    null,

                  to:
                    section.to?.name ??
                    section.to
                      ?.stop_point
                      ?.name ??
                    null,
                };
              }
            ),
        })
      );

    return NextResponse.json({
      success: true,

      allowedModes,

      count:
        normalizedJourneys.length,

      journeys:
        normalizedJourneys,
    });
  } catch (error) {
    console.error(
      "Erreur appel PRIM :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Impossible de contacter Île-de-France Mobilités.",

        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}