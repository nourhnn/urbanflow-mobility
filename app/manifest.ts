import type {
    MetadataRoute,
  } from "next";
  
  export default function manifest(): MetadataRoute.Manifest {
    return {
      name:
        "UrbanFlow Mobility",
  
      short_name:
        "UrbanFlow",
  
      description:
        "Une mobilité urbaine plus simple, intelligente et responsable.",
  
      start_url:
        "/accueil",
  
      display:
        "standalone",
  
      background_color:
        "#f7faf9",
  
      theme_color:
        "#025c1f",
  
      orientation:
        "portrait",
  
      icons: [
        {
          src:
            "/icons/icon-192.png",
  
          sizes:
            "192x192",
  
          type:
            "image/png",
        },
        {
          src:
            "/icons/icon-512.png",
  
          sizes:
            "512x512",
  
          type:
            "image/png",
        },
        {
          src:
            "/icons/icon-512-maskable.png",
  
          sizes:
            "512x512",
  
          type:
            "image/png",
  
          purpose:
            "maskable",
        },
      ],
    };
  }