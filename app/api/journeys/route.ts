import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateCO2,
  type CO2Segment,
} from "@/lib/co2/calculateCO2";

import { createClient } from "@/lib/supabase/server";

type CreateJourneyBody = {
  transportMode?: string;

  originName?: string;
  destinationName?: string;

  originLng?: number;
  originLat?: number;

  destinationLng?: number;
  destinationLat?: number;

  estimatedDurationSeconds?: number;
  distanceMeters?: number;

  co2Segments?: CO2Segment[];
};

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Utilisateur non authentifié.",
        },
        {
          status: 401,
        }
      );
    }

    let body: CreateJourneyBody;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Données du trajet invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const transportMode =
      body.transportMode;

    const originLng =
      Number(
        body.originLng
      );

    const originLat =
      Number(
        body.originLat
      );

    const destinationLng =
      Number(
        body.destinationLng
      );

    const destinationLat =
      Number(
        body.destinationLat
      );

    const duration =
      Number(
        body.estimatedDurationSeconds
      );

    const distanceMeters =
      Number(
        body.distanceMeters ??
          0
      );

    if (
      !transportMode ||
      !Number.isFinite(
        originLng
      ) ||
      !Number.isFinite(
        originLat
      ) ||
      !Number.isFinite(
        destinationLng
      ) ||
      !Number.isFinite(
        destinationLat
      ) ||
      !Number.isFinite(
        duration
      ) ||
      duration <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Informations du trajet invalides.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * On ne fait PAS confiance à une valeur
     * co2_saved envoyée par le navigateur.
     *
     * On recalcule côté serveur à partir
     * des segments.
     */
    let segments: CO2Segment[] =
      Array.isArray(
        body.co2Segments
      )
        ? body.co2Segments
            .map(
              (
                segment
              ): CO2Segment => ({
                mode:
                  segment.mode,

                distanceMeters:
                  Number(
                    segment.distanceMeters ??
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
            )
        : [];

    /*
     * Sécurité de secours pour Mapbox :
     * si aucun segment n'arrive mais qu'on
     * dispose de la distance globale.
     */
    if (
      segments.length === 0 &&
      distanceMeters > 0
    ) {
      if (
        transportMode ===
          "walking" ||
        transportMode ===
          "cycling" ||
        transportMode ===
          "driving"
      ) {
        segments = [
          {
            mode:
              transportMode,

            distanceMeters,
          },
        ];
      }
    }

    const co2 =
      calculateCO2(
        segments
      );

    /*
     * DEBUG utile :
     * tu pourras voir ça dans le terminal.
     */
    console.log(
      "UrbanFlow CO2 trajet :",
      {
        transportMode,
        distanceMeters,
        segments,
        co2,
      }
    );

    const now =
      new Date().toISOString();

    const {
      data: journey,
      error: insertError,
    } =
      await supabase
        .from("journeys")
        .insert({
          user_id:
            user.id,

          status:
            "planned",

          transport_mode:
            transportMode,

          origin_name:
            body.originName ??
            "Point de départ",

          destination_name:
            body.destinationName ??
            "Destination",

          origin_lng:
            originLng,

          origin_lat:
            originLat,

          destination_lng:
            destinationLng,

          destination_lat:
            destinationLat,

          estimated_duration_seconds:
            Math.round(
              duration
            ),

          distance_meters:
            Math.max(
              0,
              distanceMeters
            ),

          co2_segments:
            segments,

          /*
           * Ces 3 valeurs doivent être
           * persistées AVANT la validation.
           */
          trip_co2:
            co2.tripCO2Kg,

          reference_car_co2:
            co2.referenceCarCO2Kg,

          co2_saved:
            co2.co2SavedKg,

          /*
           * Les FLOWS ne sont crédités
           * qu'après validation.
           */
          flows_earned:
            0,

          rewarded_at:
            null,

          created_at:
            now,

          updated_at:
            now,
        })
        .select()
        .single();

    if (
      insertError
    ) {
      console.error(
        "Erreur création trajet :",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Impossible d'enregistrer le trajet.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        journey,

        potentialReward: {
          co2Saved:
            co2.co2SavedKg,

          flows:
            co2.flowsPotential,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Erreur route création trajet :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de la création du trajet.",
      },
      {
        status: 500,
      }
    );
  }
}