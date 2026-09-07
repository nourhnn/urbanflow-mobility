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

    const {
      data: journey,
      error: journeyError,
    } =
      await supabase
        .from("journeys")
        .select(`
          id,
          user_id,
          status,
          rewarded_at
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
      journey.rewarded_at ||
      journey.status ===
        "rewarded"
    ) {
      return NextResponse.json(
        {
          error:
            "Un trajet déjà validé ne peut pas être annulé.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      journey.status !==
        "planned" &&
      journey.status !==
        "started"
    ) {
      return NextResponse.json(
        {
          error:
            "Ce trajet ne peut plus être annulé.",
        },
        {
          status: 400,
        }
      );
    }

    const cancelledAt =
      new Date().toISOString();

    const {
      data: cancelledJourney,
      error: cancelError,
    } =
      await supabase
        .from("journeys")
        .update({
          status:
            "cancelled",

          updated_at:
            cancelledAt,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "status",
          [
            "planned",
            "started",
          ]
        )
        .select()
        .single();

    if (cancelError) {
      console.error(
        "Erreur annulation trajet :",
        cancelError
      );

      return NextResponse.json(
        {
          error:
            "Impossible d'annuler le trajet.",
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
          cancelledJourney,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erreur route cancel journey :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue lors de l'annulation du trajet.",
      },
      {
        status: 500,
      }
    );
  }
}
