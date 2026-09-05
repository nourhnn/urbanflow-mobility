import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const {
      id,
    } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Identifiant du trajet manquant.",
        },
        {
          status: 400,
        }
      );
    }

    let body: {
      lat?: number;
      lng?: number;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Coordonnées GPS invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const lat =
      Number(body.lat);

    const lng =
      Number(body.lng);

    /*
     * Vérification GPS
     */
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      console.error(
        "Position GPS invalide :",
        body
      );

      return NextResponse.json(
        {
          error:
            "Position GPS invalide.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Récupération du trajet
     */
    const {
      data: journey,
      error: journeyError,
    } =
      await supabase
        .from("journeys")
        .select(`
          id,
          user_id,
          status
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      journeyError ||
      !journey
    ) {
      console.error(
        "Trajet introuvable :",
        journeyError
      );

      return NextResponse.json(
        {
          error:
            "Trajet introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      journey.status !==
      "planned"
    ) {
      return NextResponse.json(
        {
          error:
            "Ce trajet ne peut plus être démarré.",
        },
        {
          status: 400,
        }
      );
    }

    const startedAt =
      new Date().toISOString();

    /*
     * Passage planned → started
     */
    const {
      data: updatedJourney,
      error: updateError,
    } =
      await supabase
        .from("journeys")
        .update({
          status:
            "started",

          started_at:
            startedAt,

          start_lat:
            lat,

          start_lng:
            lng,

          updated_at:
            startedAt,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "planned"
        )
        .select()
        .single();

    if (updateError) {
      console.error(
        "Erreur démarrage trajet :",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de démarrer le trajet.",
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

        journey:
          updatedJourney,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erreur route start journey :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors du démarrage du trajet.",
      },
      {
        status: 500,
      }
    );
  }
}