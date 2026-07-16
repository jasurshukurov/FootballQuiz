import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* maximum-scale=1 stops iOS Safari's automatic zoom-in when an input
            gains focus (which wrecked game layouts). Since iOS 10 pinch-zoom
            ignores this cap, so accessibility zooming still works. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no"
        />

        {/* Player photos are hotlinked from Wikimedia — warm the connection
            before the first portrait request. */}
        <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />

        <title>Football Trivia</title>
        <meta
          name="description"
          content="Daily football trivia: guess players, careers, transfers and more with a fresh set of puzzles every day."
        />
        {/* Per-route title/description/canonical/OG come from RouteSeo (helmet,
            app/_layout.tsx). Below: the route-independent structured data. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Football Trivia',
              url: 'https://footballtrivia.app/',
              applicationCategory: 'GameApplication',
              genre: 'Trivia',
              operatingSystem: 'Web, iOS, Android',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              description:
                'Play 11 free daily football trivia games: guess the player, name famous starting XIs, solve the grid, rank stars and more. New puzzles every day.',
              image: 'https://footballtrivia.app/og-image.png',
            }),
          }}
        />
        {/* Matches the default theme's bgBase (Floodlit Night). The app theme is
            user-selected and defaults to dark regardless of OS scheme, so the
            pre-JS fallback stays dark to avoid a light flash; app/_layout.tsx
            syncs body background to the live theme once JS loads. */}
        <meta name="theme-color" content="#0A0F0C" />
        <meta name="color-scheme" content="dark light" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Raw CSS escape-hatch: background fallback before JS loads, plus small
            web-polish rules (selection color, scrollbars, overscroll, focus ring)
            that react-native-web has no styling surface for. */}
        <style dangerouslySetInnerHTML={{ __html: globalWebStyles }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalWebStyles = `
/* Background fallback so the page never flashes white before the app mounts.
   Kept dark in both schemes: the in-app default theme is dark. */
body {
  background-color: #0A0F0C;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #0A0F0C;
  }
}

/* No rubber-band/navigation gesture on vertical overscroll past the app shell. */
html, body {
  overscroll-behavior-y: none;
}

/* Text selection in the app accent instead of the browser default blue. */
::selection {
  background-color: rgba(34, 197, 94, 0.35);
  color: #F4F8F5;
}

/* Themed scrollbars (Firefox + WebKit) so inner scroll areas match the shell. */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.18);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Visible keyboard-focus ring in the accent color; never shown on mouse click. */
:focus-visible {
  outline: 2px solid #22C55E;
  outline-offset: 2px;
}

/* Game artwork (badges, player images) should not be draggable as ghost images. */
img {
  -webkit-user-drag: none;
  user-drag: none;
}

/* iOS Safari auto-zooms any focused input whose font-size is below 16px.
   The app's body type is 15px, so force inputs to 16 — belt and braces with
   the viewport maximum-scale cap above. */
input, textarea, select {
  font-size: 16px !important;
}
`;
