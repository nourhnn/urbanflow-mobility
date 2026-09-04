"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { Geocoder } from "@mapbox/search-js-react";

import {
  LoaderCircle,
  LocateFixed,
} from "lucide-react";

import { canUseLocation } from "@/lib/privacy/location";

export type MapboxTravelMode =
  | "walking"
  | "cycling"
  | "driving";

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

type UrbanFlowMapProps = {
  mode?: MapboxTravelMode | null;

  onCoordinatesChange?: (
    coordinates: JourneyCoordinates
  ) => void;

  onRouteChange?: (
    route: MapboxJourneyData | null
  ) => void;
};

type RouteInfo = {
  duration: number;
  distance: number;
};

const accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

mapboxgl.accessToken = accessToken;

export default function UrbanFlowMap({
  mode = null,
  onCoordinatesChange,
  onRouteChange,
}: UrbanFlowMapProps) {
  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<mapboxgl.Map | null>(null);

  const originMarkerRef =
    useRef<mapboxgl.Marker | null>(null);

  const destinationMarkerRef =
    useRef<mapboxgl.Marker | null>(null);

  const [origin, setOrigin] =
    useState<[number, number] | null>(
      null
    );

  const [
    destination,
    setDestination,
  ] =
    useState<
      [number, number] | null
    >(null);

  const [
    routeInfo,
    setRouteInfo,
  ] =
    useState<RouteInfo | null>(
      null
    );

  const [
    routeLoading,
    setRouteLoading,
  ] =
    useState(false);

  const [
    routeError,
    setRouteError,
  ] =
    useState("");

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return;
    }

    const map =
      new mapboxgl.Map({
        container:
          mapContainerRef.current,

        style:
          "mapbox://styles/mapbox/streets-v12",

        center:
          [2.3522, 48.8566],

        zoom: 12,
      });

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
      }),
      "bottom-right"
    );

    mapRef.current =
      map;

    return () => {
      map.remove();

      mapRef.current =
        null;
    };
  }, []);

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

  useEffect(() => {
    locateUser();
  }, []);

  async function locateUser() {
    const allowed =
      await canUseLocation();
  
    if (!allowed) {
      setRouteError(
        "La localisation est désactivée dans vos paramètres de confidentialité."
      );
  
      return;
    }
  
    if (!navigator.geolocation) {
      setRouteError(
        "La géolocalisation n'est pas disponible."
      );
  
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: [
          number,
          number,
        ] = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        setOrigin(
          coordinates
        );

        const map =
          mapRef.current;

        if (!map) {
          return;
        }

        originMarkerRef.current?.remove();

        const markerElement =
          document.createElement(
            "div"
          );

        markerElement.style.width =
          "18px";

        markerElement.style.height =
          "18px";

        markerElement.style.borderRadius =
          "999px";

        markerElement.style.background =
          "#025c1f";

        markerElement.style.border =
          "4px solid white";

        markerElement.style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.25)";

        originMarkerRef.current =
          new mapboxgl.Marker({
            element:
              markerElement,
          })
            .setLngLat(
              coordinates
            )
            .addTo(map);

        map.flyTo({
          center:
            coordinates,

          zoom: 14,
        });
      },

      (error) => {
        console.error(
          "Erreur géolocalisation :",
          error
        );

        setRouteError(
          "Impossible de récupérer votre position."
        );
      },

      {
        enableHighAccuracy:
          false,

        timeout:
          20000,

        maximumAge:
          30000,
      }
    );
  }

  function handleDestination(
    result: any
  ) {
    const coordinates =
      result?.geometry
        ?.coordinates;

    if (
      !coordinates ||
      coordinates.length < 2
    ) {
      return;
    }

    const nextDestination: [
      number,
      number,
    ] = [
      coordinates[0],
      coordinates[1],
    ];

    setDestination(
      nextDestination
    );

    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    destinationMarkerRef.current?.remove();

    const markerElement =
      document.createElement(
        "div"
      );

    markerElement.style.width =
      "20px";

    markerElement.style.height =
      "20px";

    markerElement.style.borderRadius =
      "999px";

    markerElement.style.background =
      "#1ca1ae";

    markerElement.style.border =
      "4px solid white";

    markerElement.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.25)";

    destinationMarkerRef.current =
      new mapboxgl.Marker({
        element:
          markerElement,
      })
        .setLngLat(
          nextDestination
        )
        .addTo(map);

    if (origin) {
      const bounds =
        new mapboxgl.LngLatBounds();

      bounds.extend(
        origin
      );

      bounds.extend(
        nextDestination
      );

      map.fitBounds(
        bounds,
        {
          padding: 70,
          maxZoom: 15,
        }
      );
    }
  }

  useEffect(() => {
    if (
      !origin ||
      !destination ||
      !mode
    ) {
      removeMapboxRoute();

      setRouteInfo(
        null
      );

      onRouteChange?.(
        null
      );

      return;
    }

    calculateMapboxRoute();
  }, [
    origin,
    destination,
    mode,
  ]);

  async function calculateMapboxRoute() {
    if (
      !origin ||
      !destination ||
      !mode
    ) {
      return;
    }

    setRouteLoading(
      true
    );

    setRouteError(
      ""
    );

    try {
      const originString =
        `${origin[0]},${origin[1]}`;

      const destinationString =
        `${destination[0]},${destination[1]}`;

      const url =
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${originString};${destinationString}` +
        `?geometries=geojson&overview=full&access_token=${accessToken}`;

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.routes?.length
      ) {
        throw new Error(
          "Aucun itinéraire trouvé."
        );
      }

      const route =
        data.routes[0];

      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      const geojson = {
        type:
          "Feature" as const,

        properties: {},

        geometry:
          route.geometry,
      };

      const existingSource =
        map.getSource(
          "urbanflow-route"
        ) as
          | mapboxgl.GeoJSONSource
          | undefined;

      if (
        existingSource
      ) {
        existingSource.setData(
          geojson
        );
      } else {
        map.addSource(
          "urbanflow-route",
          {
            type: "geojson",
            data: geojson,
          }
        );

        map.addLayer({
          id:
            "urbanflow-route-line",

          type: "line",

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
              6,

            "line-opacity":
              0.9,
          },
        });
      }

      const info = {
        duration:
          route.duration,

        distance:
          route.distance,
      };

      setRouteInfo(
        info
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

      const bounds =
        new mapboxgl.LngLatBounds();

      route.geometry.coordinates.forEach(
        (
          coordinate: [
            number,
            number,
          ]
        ) => {
          bounds.extend(
            coordinate
          );
        }
      );

      map.fitBounds(
        bounds,
        {
          padding: 70,
          maxZoom: 15,
        }
      );
    } catch (error) {
      console.error(
        "Erreur Mapbox Directions :",
        error
      );

      setRouteInfo(
        null
      );

      onRouteChange?.(
        null
      );

      setRouteError(
        error instanceof Error
          ? error.message
          : "Impossible de calculer l'itinéraire."
      );
    } finally {
      setRouteLoading(
        false
      );
    }
  }

  function removeMapboxRoute() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    if (
      map.getLayer(
        "urbanflow-route-line"
      )
    ) {
      map.removeLayer(
        "urbanflow-route-line"
      );
    }

    if (
      map.getSource(
        "urbanflow-route"
      )
    ) {
      map.removeSource(
        "urbanflow-route"
      );
    }
  }

  function formatDuration(
    seconds: number
  ) {
    const minutes =
      Math.round(
        seconds / 60
      );

    if (
      minutes < 60
    ) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(
        minutes / 60
      );

    const remaining =
      minutes % 60;

    return remaining
      ? `${hours} h ${remaining} min`
      : `${hours} h`;
  }

  function formatDistance(
    meters: number
  ) {
    if (
      meters < 1000
    ) {
      return `${Math.round(
        meters
      )} m`;
    }

    return `${(
      meters / 1000
    ).toFixed(1)} km`;
  }

  return (
    <div className="relative h-full w-full">

      <div className="absolute left-3 right-3 top-3 z-20">

        <div className="rounded-[18px] bg-white p-2 shadow-lg">

          <Geocoder
            accessToken={
              accessToken
            }
            placeholder="Où souhaitez-vous aller ?"
            onRetrieve={
              handleDestination
            }
            options={{
              language:
                "fr",

              country:
                "FR",
            }}
          />

        </div>

      </div>

      <button
        type="button"
        onClick={
          locateUser
        }
        aria-label="Utiliser ma position"
        className="absolute bottom-24 left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-md"
      >
        <LocateFixed
          size={20}
        />
      </button>

      <div
        ref={
          mapContainerRef
        }
        className="h-full w-full"
      />

      {routeLoading && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">

          <LoaderCircle
            size={16}
            className="animate-spin text-primary"
          />

          <span className="uf-caption text-secondary">
            Calcul de l&apos;itinéraire...
          </span>

        </div>
      )}

      {routeInfo &&
        mode &&
        !routeLoading && (
          <div className="absolute bottom-4 left-3 right-3 z-20 rounded-[18px] bg-white p-4 shadow-lg">

            <div className="flex items-center justify-between">

              <div>
                <p className="uf-caption text-muted">
                  Durée estimée
                </p>

                <p className="uf-label mt-1 text-secondary">
                  {formatDuration(
                    routeInfo.duration
                  )}
                </p>
              </div>

              <div className="text-right">
                <p className="uf-caption text-muted">
                  Distance
                </p>

                <p className="uf-label mt-1 text-secondary">
                  {formatDistance(
                    routeInfo.distance
                  )}
                </p>
              </div>

            </div>

          </div>
        )}

      {routeError && (
        <div className="absolute bottom-4 left-3 right-3 z-20 rounded-[16px] bg-white p-3 shadow-lg">

          <p className="uf-caption text-error">
            {
              routeError
            }
          </p>

        </div>
      )}

    </div>
  );
}