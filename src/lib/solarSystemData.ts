// Static astronomical reference data + stylized visual layout for the
// Space Weather tab's 3D solar system viewer. Distances/sizes/speeds are
// NOT to real scale — a true-to-scale model would make the inner planets
// invisible next to Neptune's orbit, and Neptune would take 165 real
// years to complete a lap. Everything here is compressed/exaggerated for
// a legible, fun-to-watch scene; `facts` holds the real numbers, shown to
// the user as text when they click a planet.

export interface PlanetFacts {
  distanceAU: number;
  distanceKm: string;
  dayLength: string;
  yearLength: string;
  dayTempC: string;
  nightTempC: string;
  atmosphere: string;
  moonCount: number;
  blurb: string;
}

export interface MoonFacts {
  diameterKm: string;
  distanceFromPlanetKm: string;
  orbitalPeriod: string;
  blurb: string;
}

export interface MoonDef {
  name: string;
  radius: number; // scene units
  orbitRadius: number; // scene units, from planet center
  orbitSpeed: number; // radians/sec, stylized
  color: number;
  facts: MoonFacts;
}

// A notable surface landmark, rendered as a small marker fixed to a point
// on the planet's mesh (so it spins with the planet, like it's actually
// attached to the surface). localPosition is a point roughly on the
// planet's surface in the mesh's own local space (before the mesh's
// radius scaling is applied elsewhere — see SolarSystemViewer, which
// normalizes it to the planet's actual radius).
export interface PlanetFeature {
  id: string;
  name: string;
  // Unit-sphere direction (doesn't need to be normalized, the viewer
  // normalizes it) picking a point on the surface.
  direction: [number, number, number];
  blurb: string;
}

export interface PlanetDef {
  id: string;
  name: string;
  color: number; // base sphere color
  bandColor?: number; // secondary color for gas-giant banding / surface variation
  radius: number; // scene units
  orbitRadius: number; // scene units, from Sun
  orbitSpeed: number; // radians/sec, stylized (closer = faster, like real orbits, just compressed)
  spinSpeed: number; // radians/sec, stylized
  axialTilt: number; // degrees — visual flair (Uranus is famously ~98°)
  hasRing?: boolean;
  ringColor?: number;
  moons?: MoonDef[];
  features?: PlanetFeature[];
  facts: PlanetFacts;
}

export const SUN_RADIUS = 2.4;

export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    color: 0x9c9082,
    bandColor: 0x77705f,
    radius: 0.22,
    orbitRadius: 5.5,
    orbitSpeed: 0.5,
    spinSpeed: 0.05,
    axialTilt: 0.03,
    facts: {
      distanceAU: 0.39,
      distanceKm: '57.9 million km',
      dayLength: '~176 Earth days (one sunrise to the next)',
      yearLength: '88 Earth days',
      dayTempC: '~430°C',
      nightTempC: '~-180°C',
      atmosphere: 'Essentially none — a thin trace of oxygen, sodium, hydrogen',
      moonCount: 0,
      blurb: 'The closest planet to the Sun and, thanks to having no real atmosphere to hold heat, the one with the wildest day-night temperature swing of anywhere in the solar system.',
    },
  },
  {
    id: 'venus',
    name: 'Venus',
    color: 0xdfc27d,
    bandColor: 0xc9a55c,
    radius: 0.34,
    orbitRadius: 7.6,
    orbitSpeed: 0.35,
    spinSpeed: -0.012, // retrograde, and famously slow — a Venus day is longer than its year
    axialTilt: 177.4,
    facts: {
      distanceAU: 0.72,
      distanceKm: '108.2 million km',
      dayLength: '243 Earth days (retrograde — the Sun rises in the west)',
      yearLength: '225 Earth days',
      dayTempC: '~465°C',
      nightTempC: '~465°C (atmosphere is so thick heat barely varies)',
      atmosphere: '96.5% carbon dioxide, thick sulfuric-acid clouds — runaway greenhouse effect',
      moonCount: 0,
      blurb: "The hottest planet in the solar system, despite Mercury being closer to the Sun — its crushing CO2 atmosphere traps heat so effectively that day and night are almost the same temperature.",
    },
  },
  {
    id: 'earth',
    name: 'Earth',
    color: 0x3b82c4,
    bandColor: 0x2e8b57,
    radius: 0.36,
    orbitRadius: 10,
    orbitSpeed: 0.29,
    spinSpeed: 1.4,
    axialTilt: 23.4,
    moons: [
      {
        name: 'Moon',
        radius: 0.1,
        orbitRadius: 0.7,
        orbitSpeed: 0.9,
        color: 0xaaaaaa,
        facts: {
          diameterKm: '3,474 km',
          distanceFromPlanetKm: '384,400 km average',
          orbitalPeriod: '27.3 days',
          blurb: 'Earth\'s only natural satellite and the fifth-largest moon in the solar system. Tidally locked — the same face always points at Earth. Likely formed from debris after a Mars-sized body struck the young Earth ~4.5 billion years ago.',
        },
      },
    ],
    facts: {
      distanceAU: 1.0,
      distanceKm: '149.6 million km',
      dayLength: '24 hours',
      yearLength: '365.25 days',
      dayTempC: 'Global average ~15°C (varies hugely by latitude/season)',
      nightTempC: 'Global average ~15°C (varies hugely by latitude/season)',
      atmosphere: '78% nitrogen, 21% oxygen, 1% other — the only known life-supporting mix',
      moonCount: 1,
      blurb: 'Home. The only planet known to host liquid water on its surface and life of any kind — everything in this app is data about what happens here.',
    },
  },
  {
    id: 'mars',
    name: 'Mars',
    color: 0xc1440e,
    bandColor: 0x8b3a1a,
    radius: 0.26,
    orbitRadius: 13,
    orbitSpeed: 0.24,
    spinSpeed: 1.36,
    axialTilt: 25.2,
    moons: [
      {
        name: 'Phobos',
        radius: 0.03,
        orbitRadius: 0.42,
        orbitSpeed: 2.1,
        color: 0x8a7f70,
        facts: {
          diameterKm: '~22 km (irregular, potato-shaped)',
          distanceFromPlanetKm: '9,377 km',
          orbitalPeriod: '7 hours 39 minutes — faster than Mars rotates',
          blurb: 'Orbits so fast and close that it rises in the west and sets in the east, twice a day. Tidal forces are dragging it slowly inward — in 30-50 million years it will likely break apart into a ring or crash into Mars.',
        },
      },
      {
        name: 'Deimos',
        radius: 0.025,
        orbitRadius: 0.58,
        orbitSpeed: 1.3,
        color: 0x8a7f70,
        facts: {
          diameterKm: '~12 km (irregular, potato-shaped)',
          distanceFromPlanetKm: '23,460 km',
          orbitalPeriod: '30.3 hours',
          blurb: 'Smaller and smoother than Phobos, likely a captured asteroid. From Mars\' surface it would look like a bright, slow-moving star rather than a proper moon.',
        },
      },
    ],
    features: [
      {
        id: 'olympus-mons',
        name: 'Olympus Mons',
        direction: [0.3, 0.85, 0.4],
        blurb: 'The tallest volcano — and tallest planetary mountain — in the solar system, at roughly 21.9 km high (2.5x Everest). It\'s a shield volcano, built up over billions of years by lava flows, with a base wide enough to roughly cover the state of Arizona.',
      },
    ],
    facts: {
      distanceAU: 1.52,
      distanceKm: '227.9 million km',
      dayLength: '24 hours 37 minutes',
      yearLength: '687 Earth days',
      dayTempC: '~20°C at the equator in summer',
      nightTempC: '~-73°C average',
      atmosphere: '95% carbon dioxide, extremely thin — less than 1% of Earth\'s pressure',
      moonCount: 2,
      blurb: 'The "Red Planet" gets its color from iron oxide (rust) dust. Its thin atmosphere can\'t hold heat, so nights are brutally cold even though summer days can feel almost mild.',
    },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: 0xd9b48f,
    bandColor: 0xb5895f,
    radius: 1.15,
    orbitRadius: 18,
    orbitSpeed: 0.14,
    spinSpeed: 2.6, // gas giants really do spin fast — Jupiter's day is under 10 hours
    axialTilt: 3.1,
    moons: [
      {
        name: 'Io',
        radius: 0.06,
        orbitRadius: 1.5,
        orbitSpeed: 1.6,
        color: 0xe8d27a,
        facts: {
          diameterKm: '3,643 km',
          distanceFromPlanetKm: '421,700 km',
          orbitalPeriod: '1.77 days',
          blurb: 'The most volcanically active body in the solar system — over 400 active volcanoes, powered by tidal heating as Jupiter and neighboring moons Europa and Ganymede constantly flex it.',
        },
      },
      {
        name: 'Europa',
        radius: 0.055,
        orbitRadius: 1.75,
        orbitSpeed: 1.3,
        color: 0xd8c9a8,
        facts: {
          diameterKm: '3,122 km',
          distanceFromPlanetKm: '671,000 km',
          orbitalPeriod: '3.55 days',
          blurb: 'An icy crust hides a liquid water ocean underneath — possibly more water than all of Earth\'s oceans combined. One of the most promising places in the solar system to search for life.',
        },
      },
      {
        name: 'Ganymede',
        radius: 0.09,
        orbitRadius: 2.0,
        orbitSpeed: 1.0,
        color: 0x9c8f7a,
        facts: {
          diameterKm: '5,268 km',
          distanceFromPlanetKm: '1,070,000 km',
          orbitalPeriod: '7.15 days',
          blurb: 'The largest moon in the solar system — bigger than the planet Mercury. The only moon known to generate its own magnetic field.',
        },
      },
      {
        name: 'Callisto',
        radius: 0.08,
        orbitRadius: 2.3,
        orbitSpeed: 0.8,
        color: 0x6e6255,
        facts: {
          diameterKm: '4,821 km',
          distanceFromPlanetKm: '1,883,000 km',
          orbitalPeriod: '16.7 days',
          blurb: 'One of the most heavily cratered surfaces known — it\'s been geologically inactive for billions of years, so nothing has erased the impact scars.',
        },
      },
    ],
    features: [
      {
        id: 'great-red-spot',
        name: 'Great Red Spot',
        direction: [0.35, -0.15, 0.9],
        blurb: 'A storm bigger than Earth that has raged for at least 190 years (possibly since the 1600s). Winds inside it reach over 400 km/h. It has been slowly shrinking for decades but shows no sign of disappearing soon.',
      },
    ],
    facts: {
      distanceAU: 5.2,
      distanceKm: '778.5 million km',
      dayLength: '9 hours 56 minutes — the fastest spin of any planet',
      yearLength: '11.9 Earth years',
      dayTempC: '~-110°C at the cloud tops (no solid surface)',
      nightTempC: '~-110°C at the cloud tops (no solid surface)',
      atmosphere: '~90% hydrogen, 10% helium — a gas giant with no solid surface at all',
      moonCount: 95,
      blurb: 'The solar system\'s biggest planet — more massive than all the other planets combined. Its Great Red Spot is a storm bigger than Earth that has raged for centuries.',
    },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: 0xe3d3a3,
    bandColor: 0xcbb87e,
    radius: 0.98,
    orbitRadius: 23,
    orbitSpeed: 0.10,
    spinSpeed: 2.3,
    axialTilt: 26.7,
    hasRing: true,
    ringColor: 0xc9b98a,
    moons: [
      {
        name: 'Titan',
        radius: 0.075,
        orbitRadius: 2.0,
        orbitSpeed: 0.7,
        color: 0xd9a441,
        facts: {
          diameterKm: '5,150 km — 2nd-largest moon in the solar system',
          distanceFromPlanetKm: '1,222,000 km',
          orbitalPeriod: '15.9 days',
          blurb: 'The only other body in the solar system with stable liquid on its surface — lakes and rivers of liquid methane and ethane, under a thick, hazy nitrogen atmosphere denser than Earth\'s.',
        },
      },
    ],
    facts: {
      distanceAU: 9.5,
      distanceKm: '1.43 billion km',
      dayLength: '10 hours 42 minutes',
      yearLength: '29.4 Earth years',
      dayTempC: '~-140°C at the cloud tops',
      nightTempC: '~-140°C at the cloud tops',
      atmosphere: '~96% hydrogen, 3% helium',
      moonCount: 146,
      blurb: "Famous for its dramatic ring system — trillions of ice and rock chunks, some as small as dust, some as big as mountains. It's the least dense planet; it would float in water, if there were an ocean big enough.",
    },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    color: 0x9fd9d9,
    bandColor: 0x7fc4c4,
    radius: 0.62,
    orbitRadius: 28,
    orbitSpeed: 0.07,
    spinSpeed: -1.7, // retrograde
    axialTilt: 97.8,
    hasRing: true,
    ringColor: 0x6d8a8a,
    facts: {
      distanceAU: 19.2,
      distanceKm: '2.87 billion km',
      dayLength: '17 hours 14 minutes (retrograde)',
      yearLength: '84 Earth years',
      dayTempC: '~-195°C at the cloud tops',
      nightTempC: '~-195°C at the cloud tops',
      atmosphere: 'Hydrogen, helium, and methane — the methane gives it a pale blue-green color',
      moonCount: 27,
      blurb: "Tipped over almost completely on its side (98° axial tilt), likely from an ancient collision — it essentially rolls around the Sun rather than spinning upright like the others.",
    },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    color: 0x3f5fd9,
    bandColor: 0x2e46a8,
    radius: 0.6,
    orbitRadius: 33,
    orbitSpeed: 0.055,
    spinSpeed: 1.8,
    axialTilt: 28.3,
    moons: [
      {
        name: 'Triton',
        radius: 0.06,
        orbitRadius: 1.1,
        orbitSpeed: -0.6,
        color: 0xbcd0e0,
        facts: {
          diameterKm: '2,707 km',
          distanceFromPlanetKm: '354,800 km',
          orbitalPeriod: '5.88 days (retrograde)',
          blurb: 'Orbits backwards relative to Neptune\'s rotation — the only large moon in the solar system that does. Almost certainly a captured Kuiper Belt object, not formed alongside Neptune. Has active nitrogen geysers.',
        },
      },
    ],
    facts: {
      distanceAU: 30.1,
      distanceKm: '4.5 billion km',
      dayLength: '16 hours 6 minutes',
      yearLength: '165 Earth years',
      dayTempC: '~-200°C at the cloud tops',
      nightTempC: '~-200°C at the cloud tops',
      atmosphere: 'Hydrogen, helium, and methane',
      moonCount: 14,
      blurb: 'The windiest place in the solar system — supersonic storms up to 2,100 km/h have been recorded. Its largest moon Triton orbits backwards, suggesting it was a captured object rather than formed alongside Neptune.',
    },
  },
];

export const SUN_FACTS = {
  distanceAU: 0,
  distanceKm: 'center of the solar system',
  dayLength: '~27 Earth days at the equator (the Sun is gas, so it spins faster at the equator than the poles)',
  yearLength: '—',
  surfaceTempC: '~5,500°C (photosphere)',
  coreTempC: '~15,000,000°C (core)',
  composition: '~73% hydrogen, 25% helium, fused into helium in the core, releasing the energy that powers the whole solar system',
  blurb: 'A G-type main-sequence star, about 4.6 billion years old and roughly halfway through its ~10 billion year hydrogen-burning lifetime. Everything on this page — the flares, wind, and aurora — comes from activity here.',
};
