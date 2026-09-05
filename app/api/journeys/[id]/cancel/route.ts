import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { createClient } from "@/lib/supabase/server";
  
  export async function POST(
    _request: NextRequest,
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
              "Seul un trajet planifié peut être annulé.",
          },
          {
            status: 400,
          }
        );
      }
  
      const now =
        new Date().toISOString();
  
      const {
        error: updateError,
      } =
        await supabase
          .from("journeys")
          .update({
            status:
              "cancelled",
  
            updated_at:
              now,
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
          );
  
      if (updateError) {
        console.error(
          "Erreur annulation trajet :",
          updateError
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
  
      return NextResponse.json({
        success:
          true,
      });
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