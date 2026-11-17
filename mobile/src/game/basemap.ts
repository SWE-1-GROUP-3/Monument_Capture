// Map tiles for the home map.
//
// CARTO Voyager (the mockup's look) needs a free key since September 2026;
// without one CARTO returns tiles stamped "API KEY REQUIRED". So the demo uses
// OpenStreetMap's standard tiles (no key) unless a CARTO key is configured:
//   mobile/.env  →  EXPO_PUBLIC_CARTO_API_KEY=your_key
// Get a free key (no account) at https://carto.com/basemaps/apikey/
// Both providers must stay credited on the map (the attribution below).

const cartoKey = process.env.EXPO_PUBLIC_CARTO_API_KEY?.trim();

export type Basemap = { url: string; attribution: string; provider: "carto" | "osm" };

export const BASEMAP: Basemap = cartoKey
  ? {
      provider: "carto",
      url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }
  : {
      provider: "osm",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
