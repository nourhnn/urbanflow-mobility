import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:
      "UrbanFlow Mobility",

    template:
      "%s | UrbanFlow Mobility",
  },

  description:
    "Une mobilité urbaine plus simple, intelligente et responsable.",

  applicationName:
    "UrbanFlow Mobility",

  appleWebApp: {
    capable:
      true,

    statusBarStyle:
      "default",

    title:
      "UrbanFlow",
  },

  icons: {
    icon: [
      {
        url:
          "/icons/icon-192.png",

        sizes:
          "192x192",

        type:
          "image/png",
      },
      {
        url:
          "/icons/icon-512.png",

        sizes:
          "512x512",

        type:
          "image/png",
      },
    ],

    apple: [
      {
        url:
          "/icons/apple-touch-icon.png",

        sizes:
          "180x180",

        type:
          "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor:
    "#025c1f",

  width:
    "device-width",

  initialScale:
    1,

  maximumScale:
    1,

  viewportFit:
    "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}