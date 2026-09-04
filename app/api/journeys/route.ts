import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateJourneyBody = {
  transportMode: string;

  originName?: string | null;
  destinationName?: string | null;

  originLng: number;
  originLat: number;

  destinationLng: number;
  destinationLat: number;

  estimatedDurationSeconds: number;

  distanceMeters?: number | null;

  tripCO2?: number;
  referenceCarCO2?: number;
  co2Saved?: number;

  /*
   * Valeur affichée à l'utilisateur.
   *
   * ATTENTION :
   * elle n'est pas encore créditée.
   */
  flowsPotential?: number;
};

function isFiniteNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

export async function POST(
  request: NextRequest
) {
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
        success: false,
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
        success: false,
        error:
          "Corps de requête invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    transportMode,

    originName,
    destinationName,

    originLng,
    originLat,

    destinationLng,
    destinationLat,

    estimatedDurationSeconds,

    distanceMeters,

    tripCO2 = 0,
    referenceCarCO2 = 0,
    co2Saved = 0,

    flowsPotential = 0,
  } = body;

  if (
    !transportMode ||
    typeof transportMode !==
      "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Mode de transport invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isFiniteNumber(
      originLng
    ) ||
    !isFiniteNumber(
      originLat
    ) ||
    !isFiniteNumber(
      destinationLng
    ) ||
    !isFiniteNumber(
      destinationLat
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Coordonnées invalides.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isFiniteNumber(
      estimatedDurationSeconds
    ) ||
    estimatedDurationSeconds <=
      0
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Durée estimée invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    distanceMeters !==
      undefined &&
    distanceMeters !==
      null &&
    (
      !isFiniteNumber(
        distanceMeters
      ) ||
      distanceMeters < 0
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Distance invalide.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isFiniteNumber(
      tripCO2
    ) ||
    !isFiniteNumber(
      referenceCarCO2
    ) ||
    !isFiniteNumber(
      co2Saved
    ) ||
    !isFiniteNumber(
      flowsPotential
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Valeurs environnementales invalides.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Petite sécurité :
   * aucune valeur environnementale
   * négative.
   */
  const safeTripCO2 =
    Math.max(
      0,
      tripCO2
    );

  const safeReferenceCO2 =
    Math.max(
      0,
      referenceCarCO2
    );

  const safeCO2Saved =
    Math.max(
      0,
      co2Saved
    );

  const safeFlowsPotential =
    Math.max(
      0,
      Math.round(
        flowsPotential
      )
    );

  /*
   * IMPORTANT :
   *
   * flows_earned reste à 0.
   *
   * On enregistre uniquement les données
   * nécessaires à la future récompense.
   */
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
          originName ??
          null,

        destination_name:
          destinationName ??
          null,

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
            estimatedDurationSeconds
          ),

        distance_meters:
          distanceMeters ??
          null,

        trip_co2:
          safeTripCO2,

        reference_car_co2:
          safeReferenceCO2,

        co2_saved:
          safeCO2Saved,

        /*
         * Ne surtout pas créditer ici.
         */
        flows_earned:
          0,

        rewarded_at:
          null,
      })
      .select()
      .single();

  if (
    insertError ||
    !journey
  ) {
    console.error(
      "Erreur création trajet :",
      insertError
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Impossible d'enregistrer le trajet.",

        details:
          insertError?.message ??
          null,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,

      journey,

      rewardsPreview: {
        co2Saved:
          safeCO2Saved,

        flowsPotential:
          safeFlowsPotential,
      },
    },
    {
      status: 201,
    }
  );
}