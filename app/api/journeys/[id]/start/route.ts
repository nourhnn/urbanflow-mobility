import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StartJourneyBody = {
  latitude: number;
  longitude: number;
};

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utilisateur non authentifié.",
      },
      {
        status: 401,
      }
    );
  }

  let body: StartJourneyBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Corps de requête invalide.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    latitude,
    longitude,
  } = body;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Position GPS invalide.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * On récupère d'abord le trajet
   * pour vérifier qu'il appartient
   * bien à l'utilisateur connecté.
   */
  const {
    data: journey,
    error: journeyError,
  } = await supabase
    .from("journeys")
    .select(
      `
        id,
        user_id,
        status,
        started_at
      `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json(
      {
        success: false,
        error: "Trajet introuvable.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Un trajet ne peut être démarré
   * que s'il est encore planned.
   */
  if (journey.status !== "planned") {
    return NextResponse.json(
      {
        success: false,
        error:
          journey.status === "started"
            ? "Ce trajet est déjà démarré."
            : "Ce trajet ne peut plus être démarré.",
      },
      {
        status: 409,
      }
    );
  }

  const startedAt =
    new Date().toISOString();

  const {
    data: updatedJourney,
    error: updateError,
  } = await supabase
    .from("journeys")
    .update({
      status: "started",

      started_at: startedAt,

      start_lat: latitude,

      start_lng: longitude,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "planned")
    .select()
    .single();

  if (updateError || !updatedJourney) {
    console.error(
      "Erreur démarrage trajet :",
      updateError
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Impossible de démarrer le trajet.",
        details:
          updateError?.message ?? null,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    journey: updatedJourney,
  });
}