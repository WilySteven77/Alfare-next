import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Alfa-Red",
  description: "Energia y Telecomunicaciones",
  icons: {
    icon: "/assets/imagenes/Logo.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/lightgallery-js/1.4.0/css/lightgallery.min.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/swiper@7/swiper-bundle.min.css"
        />
        {/* Archivos estáticos en public/ → URL sin "public" */}
        <link rel="stylesheet" href="/assets/Css/style.css" />
      </head>
      <body>
        {children}
        <Script
          src="https://unpkg.com/swiper@7/swiper-bundle.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/lightgallery-js/1.4.0/js/lightgallery.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
