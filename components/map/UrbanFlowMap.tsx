"use client";

import dynamic from "next/dynamic";
import mapboxgl from "mapbox-gl";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { canUseLocation } from "@/lib/privacy/location";

import "mapbox-gl/dist/mapbox-gl.css";

const Geocoder = dynamic(
  () =>
    import("@mapbox/search-js-react").then(
      (module) => module.Geocoder
    ),
  {
    ssr: false,
  }
);

export type MapboxTravelMode =
  | "walking"
  | "cycling"
  | "driving";

export type JourneyPoint = {
  name: string;
  coordinates: [number, number];
};

export type JourneyCoordinates = {
  origin: [number, number] | null;
  destination: [number, number] | null;
};

export type MapboxJourneyData = {
  mode: MapboxTravelMode;
  duration: number;
  distance: number;
  origin: [number, number];
  destination: [number, number];
};

type Props = {
  mode?: MapboxTravelMode | null;
  originMode?: "current" | "custom";
  initialDestination?: JourneyPoint | null;

  onCoordinatesChange?: (
    coordinates: JourneyCoordinates
  ) => void;

  onRouteChange?: (
    route: MapboxJourneyData | null
  ) => void;

  onOriginChange?: (
    origin: JourneyPoint | null
  ) => void;

  onDestinationChange?: (
    destination: JourneyPoint | null
  ) => void;
};

const DEFAULT_CENTER: [number, number] = [
  2.3522,
  48.8566,
];

export default function UrbanFlowMap({
  mode = null,
  originMode = "current",
  initialDestination = null,
  onCoordinatesChange,
  onRouteChange,
  onOriginChange,
  onDestinationChange,
}: Props) {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<mapboxgl.Map | null>(null);

  const originMarkerRef =
    useRef<mapboxgl.Marker | null>(null);

  const destinationMarkerRef =
    useRef<mapboxgl.Marker | null>(null);

  const [
    mapInstance,
    setMapInstance,
  ] =
    useState<mapboxgl.Map | null>(
      null
    );

  const [
    origin,
    setOrigin,
  ] =
    useState<
      [number, number] | null
    >(null);

  const [
    destination,
    setDestination,
  ] =
    useState<
      [number, number] | null
    >(null);

  const [
    locationError,
    setLocationError,
  ] = useState("");

  const [
    routeError,
    setRouteError,
  ] = useState("");

  const accessToken =
    process.env
      .NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current ||
      !accessToken
    ) {
      return;
    }

    mapboxgl.accessToken =
      accessToken;

    const map =
      new mapboxgl.Map({
        container:
          mapContainerRef.current,
        style:
          "mapbox://styles/mapbox/streets-v12",
        center:
          DEFAULT_CENTER,
        zoom: 11,
      });

    map.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    mapRef.current = map;

    setMapInstance(map);

    return () => {
      originMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();

      map.remove();

      mapRef.current = null;
    };
  }, [accessToken]);

  function updateOriginMarker(
    coordinates: [number, number]
  ) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    originMarkerRef.current?.remove();

    const element =
      document.createElement("div");

    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius =
      "999px";
    element.style.background =
      "#025c1f";
    element.style.border =
      "3px solid white";
    element.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.25)";

    originMarkerRef.current =
      new mapboxgl.Marker({
        element,
      })
        .setLngLat(coordinates)
        .addTo(map);
  }

  function updateDestinationMarker(
    coordinates: [number, number]
  ) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    destinationMarkerRef.current?.remove();

    const element =
      document.createElement("div");

    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius =
      "999px";
    element.style.background =
      "#1ca1ae";
    element.style.border =
      "3px solid white";
    element.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.25)";

    destinationMarkerRef.current =
      new mapboxgl.Marker({
        element,
      })
        .setLngLat(coordinates)
        .addTo(map);
  }

  async function locateUser() {
    setLocationError("");

    const allowed =
      await canUseLocation();

    if (!allowed) {
      setLocationError(
        "La localisation est désactivée dans vos paramètres de confidentialité."
      );

      return;
    }

    if (!navigator.geolocation) {
      setLocationError(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: [
          number,
          number
        ] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setOrigin(coordinates);

        updateOriginMarker(
          coordinates
        );

        onOriginChange?.({
          name:
            "Ma position actuelle",
          coordinates,
        });

        mapRef.current?.flyTo({
          center: coordinates,
          zoom: 14,
        });
      },

      () => {
        setLocationError(
          "Impossible de récupérer votre position."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }

  /*
   * Si l'utilisateur choisit
   * "Ma position", on récupère
   * automatiquement le GPS.
   *
   * S'il choisit un départ manuel,
   * on efface l'ancienne origine.
   */
  useEffect(() => {
    if (
      originMode ===
      "current"
    ) {
      locateUser();

      return;
    }

    setOrigin(null);

    originMarkerRef.current?.remove();

    originMarkerRef.current =
      null;

    onOriginChange?.(null);
  }, [
    originMode,
    mapInstance,
  ]);

  /*
   * Destination provenant par exemple
   * de Maison / Travail depuis
   * l'accueil ou le profil.
   */
  useEffect(() => {
    if (
      !initialDestination ||
      !mapInstance
    ) {
      return;
    }

    const coordinates =
      initialDestination.coordinates;

    setDestination(
      coordinates
    );

    updateDestinationMarker(
      coordinates
    );

    onDestinationChange?.(
      initialDestination
    );

    mapRef.current?.flyTo({
      center: coordinates,
      zoom: 14,
    });
  }, [
    initialDestination,
    mapInstance,
  ]);

  /*
   * Synchronisation des coordonnées
   * avec JourneyPlanner.
   */
  useEffect(() => {
    onCoordinatesChange?.({
      origin,
      destination,
    });
  }, [
    origin,
    destination,
    onCoordinatesChange,
  ]);

  /*
   * Calcul de l'itinéraire Mapbox
   * lorsqu'on dispose d'une origine,
   * d'une destination et d'un mode.
   */
  useEffect(() => {
    async function loadRoute() {
      const map =
        mapRef.current;

      if (
        !map ||
        !origin ||
        !destination ||
        !mode ||
        !accessToken
      ) {
        onRouteChange?.(null);

        if (
          map?.getLayer(
            "urbanflow-route"
          )
        ) {
          map.removeLayer(
            "urbanflow-route"
          );
        }

        if (
          map?.getSource(
            "urbanflow-route"
          )
        ) {
          map.removeSource(
            "urbanflow-route"
          );
        }

        return;
      }

      setRouteError("");

      try {
        const profile =
          mode === "cycling"
            ? "cycling"
            : mode ===
                "driving"
              ? "driving"
              : "walking";

        const response =
          await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&steps=false&access_token=${accessToken}`
          );

        if (!response.ok) {
          throw new Error(
            "Erreur Mapbox Directions."
          );
        }

        const data =
          await response.json();

        const route =
          data.routes?.[0];

        if (!route) {
          throw new Error(
            "Aucun itinéraire disponible."
          );
        }

        const geojson = {
          type:
            "Feature" as const,
          properties: {},
          geometry:
            route.geometry,
        };

        if (
          map.getSource(
            "urbanflow-route"
          )
        ) {
          (
            map.getSource(
              "urbanflow-route"
            ) as mapboxgl.GeoJSONSource
          ).setData(
            geojson
          );
        } else {
          map.addSource(
            "urbanflow-route",
            {
              type:
                "geojson",
              data:
                geojson,
            }
          );

          map.addLayer({
            id:
              "urbanflow-route",
            type:
              "line",
            source:
              "urbanflow-route",

            layout: {
              "line-cap":
                "round",
              "line-join":
                "round",
            },

            paint: {
              "line-color":
                "#1ca1ae",
              "line-width":
                5,
              "line-opacity":
                0.9,
            },
          });
        }

        const bounds =
          new mapboxgl.LngLatBounds();

        bounds.extend(origin);
        bounds.extend(
          destination
        );

        map.fitBounds(
          bounds,
          {
            padding: 60,
            maxZoom: 15,
          }
        );

        onRouteChange?.({
          mode,
          duration:
            route.duration,
          distance:
            route.distance,
          origin,
          destination,
        });
      } catch (error) {
        console.error(
          "Erreur itinéraire Mapbox :",
          error
        );

        setRouteError(
          "Impossible de calculer cet itinéraire."
        );

        onRouteChange?.(null);
      }
    }

    loadRoute();
  }, [
    origin,
    destination,
    mode,
    accessToken,
    onRouteChange,
  ]);

  if (!accessToken) {
    return (
      <div className="uf-card mt-5 p-5">
        <p className="uf-body text-error">
          La clé Mapbox est manquante.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">

      <div className="uf-card overflow-hidden">

        {/* Départ */}
        <div className="border-b border-border p-4">

          <p className="uf-label mb-2 text-secondary">
            Départ
          </p>

          {originMode ===
          "current" ? (
            <button
              type="button"
              onClick={
                locateUser
              }
              className="flex w-full items-center gap-3 rounded-[16px] bg-primary-soft px-4 py-3 text-left"
            >

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                <LocateFixed
                  size={17}
                />
              </div>

              <div>
                <p className="uf-label text-primary">
                  Ma position actuelle
                </p>

                <p className="uf-caption mt-1 text-muted">
                  Utiliser le GPS
                </p>
              </div>

            </button>
          ) : (
            <Geocoder
              accessToken={
                accessToken
              }
              map={
                mapInstance ??
                undefined
              }
              mapboxgl={
                mapboxgl
              }
              placeholder="Rechercher une adresse de départ"
              options={{
                language:
                  "fr",
                country:
                  "FR",
              }}
              onRetrieve={(
                result
              ) => {
                const coords =
                  result
                    ?.geometry
                    ?.coordinates;

                if (
                  !Array.isArray(
                    coords
                  ) ||
                  coords.length <
                    2
                ) {
                  return;
                }

                const coordinates: [
                  number,
                  number
                ] = [
                  Number(
                    coords[0]
                  ),
                  Number(
                    coords[1]
                  ),
                ];

                const name =
                  result
                    .properties
                    ?.full_address ||
                  result
                    .properties
                    ?.name ||
                  result
                    .properties
                    ?.place_formatted ||
                  "Point de départ";

                setOrigin(
                  coordinates
                );

                updateOriginMarker(
                  coordinates
                );

                onOriginChange?.({
                  name,
                  coordinates,
                });

                mapRef.current?.flyTo({
                  center:
                    coordinates,
                  zoom:
                    14,
                });
              }}
            />
          )}

        </div>

        {/* Destination */}
        <div className="p-4">

          <p className="uf-label mb-2 text-secondary">
            Destination
          </p>

          <Geocoder
            accessToken={
              accessToken
            }
            map={
              mapInstance ??
                undefined
            }
            mapboxgl={
              mapboxgl
            }
            placeholder={
              initialDestination?.name ||
              "Où voulez-vous aller ?"
            }
            options={{
              language:
                "fr",
              country:
                "FR",
            }}
            onRetrieve={(
              result
            ) => {
              const coords =
                result
                  ?.geometry
                  ?.coordinates;

              if (
                !Array.isArray(
                  coords
                ) ||
                coords.length <
                  2
              ) {
                return;
              }

              const coordinates: [
                number,
                number
              ] = [
                Number(
                  coords[0]
                ),
                Number(
                  coords[1]
                ),
              ];

              const name =
                result
                  .properties
                  ?.full_address ||
                result
                  .properties
                  ?.name ||
                result
                  .properties
                  ?.place_formatted ||
                "Destination";

              const point:
                JourneyPoint = {
                name,
                coordinates,
              };

              setDestination(
                coordinates
              );

              updateDestinationMarker(
                coordinates
              );

              onDestinationChange?.(
                point
              );

              mapRef.current?.flyTo({
                center:
                  coordinates,
                zoom:
                  14,
              });
            }}
          />

        </div>

        {/* Carte */}
        <div
          ref={
            mapContainerRef
          }
          className="h-[330px] w-full"
        />

      </div>

      {locationError && (
        <p className="uf-caption mt-3 text-error">
          {locationError}
        </p>
      )}

      {routeError && (
        <p className="uf-caption mt-3 text-error">
          {routeError}
        </p>
      )}

    </div>
  );
}