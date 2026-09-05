import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { createClient } from "@/lib/supabase/server";
  
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
              "Position GPS invalide.",
          },
          {
            status: 400,
          }
        );
      }
  
      /*
       * IMPORTANT :
       * conversion explicite en Number
       */
      const lat =
        Number(body.lat);
  
      const lng =
        Number(body.lng);
  
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
            destination_lat,
            destination_lng,
            started_at,
            rewarded_at,
            co2_saved
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
          "Erreur récupération trajet :",
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
        "started"
      ) {
        return NextResponse.json(
          {
            error:
              "Ce trajet n'est pas en cours.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        !journey.started_at
      ) {
        return NextResponse.json(
          {
            error:
              "Le trajet n'a pas été démarré correctement.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        journey.rewarded_at
      ) {
        return NextResponse.json(
          {
            error:
              "Ce trajet a déjà été récompensé.",
          },
          {
            status: 400,
          }
        );
      }
  
      const destinationLat =
        Number(
          journey.destination_lat
        );
  
      const destinationLng =
        Number(
          journey.destination_lng
        );
  
      if (
        !Number.isFinite(
          destinationLat
        ) ||
        !Number.isFinite(
          destinationLng
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Destination du trajet invalide.",
          },
          {
            status: 500,
          }
        );
      }
  
      const distanceToDestination =
        calculateDistanceMeters(
          lat,
          lng,
          destinationLat,
          destinationLng
        );
  
      const maxDistanceMeters =
        200;
  
      if (
        distanceToDestination >
        maxDistanceMeters
      ) {
        return NextResponse.json(
          {
            error:
              `Vous êtes encore à environ ${Math.round(
                distanceToDestination
              )} m de votre destination.`,
  
            distanceToDestination:
              Math.round(
                distanceToDestination
              ),
          },
          {
            status: 400,
          }
        );
      }
  
      const completedAt =
        new Date().toISOString();
  
      const {
        error: completionError,
      } =
        await supabase
          .from("journeys")
          .update({
            status:
              "completed",
  
            completed_at:
              completedAt,
  
            end_lat:
              lat,
  
            end_lng:
              lng,
  
            updated_at:
              completedAt,
          })
          .eq(
            "id",
            journey.id
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "status",
            "started"
          );
  
      if (
        completionError
      ) {
        console.error(
          "Erreur validation trajet :",
          completionError
        );
  
        return NextResponse.json(
          {
            error:
              "Impossible de terminer le trajet.",
          },
          {
            status: 500,
          }
        );
      }
  
      const {
        data: rewardData,
        error: rewardError,
      } =
        await supabase.rpc(
          "reward_completed_journey",
          {
            p_journey_id:
              journey.id,
          }
        );
  
      if (
        rewardError
      ) {
        console.error(
          "Erreur attribution récompense :",
          rewardError
        );
  
        return NextResponse.json(
          {
            error:
              "Le trajet a été validé, mais les FLOWS n'ont pas pu être attribués.",
  
            journeyCompleted:
              true,
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
  
          journeyCompleted:
            true,
  
          distanceToDestination:
            Math.round(
              distanceToDestination
            ),
  
          reward:
            rewardData,
        },
        {
          status: 200,
        }
      );
    } catch (error) {
      console.error(
        "Erreur route complete journey :",
        error
      );
  
      return NextResponse.json(
        {
          error:
            "Une erreur est survenue lors de la validation du trajet.",
        },
        {
          status: 500,
        }
      );
    }
  }