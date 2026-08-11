// Static astronomical reference data + stylized visual layout for the
// Space Weather tab's 3D solar system viewer. Distances/sizes/speeds are
// NOT to real scale — a true-to-scale model would make the inner planets
// invisible next to Neptune's orbit, and Neptune would take 165 real
// years to complete a lap. Everything here is compressed/exaggerated for
// a legible, fun-to-watch scene; `facts` holds the real numbers, shown to
// the user as text when they click a planet.
//
// `weather` is deliberately NOT presented as live data — there's no
// live, public, key-free feed of "current conditions" for other planets
// (NASA's InSight Mars weather service, the closest thing that existed,
// was retired when the lander lost power in Dec 2022). Framing it as
// live would be fabricating data. Instead it's real planetary science —
// typical/average conditions, known extremes, and documented phenomena
// — presented in the same shape as the app's actual Earth weather
// (temp/pressure/wind stats + notable-conditions bullets) so exploring
// a planet reads like checking its forecast, without pretending numbers
// update in real time.

export interface WeatherReport {
  headline: string; // punchy one-liner, like a forecast summary
  tempRange: string;
  pressure: string;
  wind: string;
  notable: string[]; // 2-4 short, concrete phenomena
}

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
  weather: WeatherReport;
}

export interface MoonFacts {
  diameterKm: string;
  distanceFromPlanetKm: string;
  orbitalPeriod: string;
  blurb: string;
  weather: WeatherReport;
}

export interface MoonDef {
  name: string;
  radius: number; // scene units
  orbitRadius: number; // scene units, from planet center
  orbitSpeed: number; // radians/sec, stylized
  color: number;
  accentColor?: number; // secondary shading color for surface texture
  // Surface rendering style — picks which procedural texture generator
  // the viewer uses. Defaults to 'cratered' (airless rock/ice + impacts)
  // when omitted. 'hazy' = thick opaque cloud/atmosphere deck (no visible
  // surface, like Titan). 'volcanic' = Io's sulfur patchwork, no craters.
  // 'icy' = Europa-style linear fracture lines. 'cantaloupe' = Triton's
  // dimpled terrain.
  style?: 'cratered' | 'hazy' | 'volcanic' | 'icy' | 'cantaloupe';
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
      weather: {
        headline: 'No air, no weather — just extremes',
        tempRange: '-180°C to 430°C (610°C swing — the biggest of any planet)',
        pressure: 'Essentially none (10⁻¹⁵ bar — a near-vacuum "exosphere")',
        wind: 'None — no atmosphere to move',
        notable: [
          'No clouds, no rain, no wind — ever. Just direct exposure to the Sun and space.',
          'Permanently shadowed polar crater floors are cold enough (below -180°C) to hold water ice, despite daytime heat nearby that could melt lead.',
          'Surface directly weathered by solar wind and micrometeorite impacts instead of erosion.',
        ],
      },
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
      weather: {
        headline: 'Runaway greenhouse — hot enough to melt lead, everywhere, always',
        tempRange: '~465°C, essentially constant day/night and pole/equator',
        pressure: '92 bar at the surface — like being 900m deep in Earth\'s ocean',
        wind: 'Surface: a gentle few km/h · Cloud-tops (60km up): 300+ km/h "super-rotation," circling the whole planet in just 4-5 days',
        notable: [
          'Clouds are sulfuric acid, not water — any rain evaporates before reaching the ground ("virga").',
          'Lightning has been detected flickering inside the cloud deck.',
          'The thick atmosphere itself rotates far faster than the solid planet (which takes 243 days to spin once).',
          'Likely had oceans billions of years ago, lost to an irreversible greenhouse runaway — a cautionary tale astronomers study closely.',
        ],
      },
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
        accentColor: 0xd8d8d8,
        style: 'cratered',
        facts: {
          diameterKm: '3,474 km',
          distanceFromPlanetKm: '384,400 km average',
          orbitalPeriod: '27.3 days',
          blurb: 'Earth\'s only natural satellite and the fifth-largest moon in the solar system. Tidally locked — the same face always points at Earth. Likely formed from debris after a Mars-sized body struck the young Earth ~4.5 billion years ago.',
          weather: {
            headline: 'No air, no weather — silent and airless',
            tempRange: '-173°C (night) to 127°C (direct sun) — extreme swings, no atmosphere to buffer them',
            pressure: 'Essentially none (trace exosphere only)',
            wind: 'None',
            notable: [
              'No erosion at all — footprints and rover tracks from the 1960s-70s are still there, undisturbed.',
              'Permanently shadowed polar crater floors confirmed to hold water ice.',
              'Fine, sharp, abrasive dust ("regolith") coats everything — never weathered smooth by wind or water.',
            ],
          },
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
      weather: {
        headline: 'The only planet with real, live weather to check',
        tempRange: 'Global average ~15°C — but every climate from -89°C (Antarctica) to 57°C (Death Valley) exists somewhere right now',
        pressure: '~1 bar (1,013 hPa) at sea level — the reference "normal" every other pressure on this page is compared against',
        wind: 'Typically 0-30 km/h at the surface; hurricanes/typhoons exceed 250 km/h; jet streams above 300 km/h',
        notable: [
          'The only body in the solar system with liquid water AND an active water cycle AND life.',
          'You don\'t have to imagine this one — the rest of this app is a real, live forecast for wherever your station is.',
        ],
      },
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
        accentColor: 0x6e6255,
        style: 'cratered',
        facts: {
          diameterKm: '~22 km (irregular, potato-shaped)',
          distanceFromPlanetKm: '9,377 km',
          orbitalPeriod: '7 hours 39 minutes — faster than Mars rotates',
          blurb: 'Orbits so fast and close that it rises in the west and sets in the east, twice a day. Tidal forces are dragging it slowly inward — in 30-50 million years it will likely break apart into a ring or crash into Mars.',
          weather: {
            headline: 'No air — a bare rock skimming low over Mars',
            tempRange: '~-4°C (sunlit) to -112°C (shadow)',
            pressure: 'None',
            wind: 'None',
            notable: [
              'Mysterious parallel grooves streak across the surface — possibly early cracking from the tidal stress that\'s slowly pulling it apart.',
              'So low and fast-orbiting that from Mars\' surface it visibly crosses the sky in about 4 hours.',
            ],
          },
        },
      },
      {
        name: 'Deimos',
        radius: 0.025,
        orbitRadius: 0.58,
        orbitSpeed: 1.3,
        color: 0x8a7f70,
        accentColor: 0x6e6255,
        style: 'cratered',
        facts: {
          diameterKm: '~12 km (irregular, potato-shaped)',
          distanceFromPlanetKm: '23,460 km',
          orbitalPeriod: '30.3 hours',
          blurb: 'Smaller and smoother than Phobos, likely a captured asteroid. From Mars\' surface it would look like a bright, slow-moving star rather than a proper moon.',
          weather: {
            headline: 'No air — a smooth, quiet speck',
            tempRange: 'Roughly -40°C on average, with day/night swings',
            pressure: 'None',
            wind: 'None',
            notable: [
              'Smoother than Phobos — much of its surface is blanketed in loose dust that\'s filled in older craters.',
              'Far enough out that it drifts slowly across the Martian sky over hours, rather than visibly racing like Phobos.',
            ],
          },
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
      weather: {
        headline: 'Cold desert with planet-swallowing dust storms',
        tempRange: '-153°C (winter poles) to ~20°C (summer equator midday) — average around -63°C',
        pressure: '~0.6% of Earth\'s (6-11 hPa, varies by season as the poles freeze/thaw CO2)',
        wind: 'Typically light, but storms can reach ~100 km/h — though the air is so thin it feels more like a stiff breeze than a hurricane',
        notable: [
          'Global dust storms occasionally engulf the ENTIRE planet for weeks — one in 2018 ended NASA\'s Opportunity rover by blocking sunlight to its solar panels.',
          'Dust devils have been photographed towering up to 8 km tall.',
          'Polar ice caps are part water ice, part frozen CO2 ("dry ice") — they visibly grow and shrink with the seasons.',
          'Morning frost and thin water-ice clouds have been observed by landers.',
        ],
      },
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
        accentColor: 0xd9773a,
        style: 'volcanic',
        facts: {
          diameterKm: '3,643 km',
          distanceFromPlanetKm: '421,700 km',
          orbitalPeriod: '1.77 days',
          blurb: 'The most volcanically active body in the solar system — over 400 active volcanoes, powered by tidal heating as Jupiter and neighboring moons Europa and Ganymede constantly flex it.',
          weather: {
            headline: 'A moon that\'s actively, visibly erupting right now',
            tempRange: '~-143°C on average — but active lava flows and vents spike past 1,600°C, hotter than any volcano on Earth',
            pressure: 'A wisp of an atmosphere (sulfur dioxide) — mostly frozen out at night, sublimating back by day',
            wind: 'Effectively none in the usual sense',
            notable: [
              'Over 400 active volcanoes constantly resurface it — no impact craters survive here, unlike almost everywhere else.',
              'Its thin SO₂ atmosphere is regenerated daily by volcanic outgassing and sunlight, then largely refreezes each night.',
              'Sulfur and sulfur-dioxide frost paint it yellow, orange, and red — nicknamed the "pizza moon."',
            ],
          },
        },
      },
      {
        name: 'Europa',
        radius: 0.055,
        orbitRadius: 1.75,
        orbitSpeed: 1.3,
        color: 0xd8c9a8,
        accentColor: 0xa8785a,
        style: 'icy',
        facts: {
          diameterKm: '3,122 km',
          distanceFromPlanetKm: '671,000 km',
          orbitalPeriod: '3.55 days',
          blurb: 'An icy crust hides a liquid water ocean underneath — possibly more water than all of Earth\'s oceans combined. One of the most promising places in the solar system to search for life.',
          weather: {
            headline: 'A frozen shell over a hidden global ocean',
            tempRange: '-160°C (equator) to -220°C (poles)',
            pressure: 'Extremely thin oxygen atmosphere — a trillionth of Earth\'s',
            wind: 'None to speak of',
            notable: [
              'Long reddish-brown cracks ("linea") streak the ice, caused by Jupiter\'s tides constantly flexing the crust.',
              'Very few impact craters — the surface is geologically young, suggesting it\'s still active.',
              'Hubble has tentatively spotted plumes of water vapor venting from the surface, echoing Enceladus at Saturn.',
              'The subsurface ocean, kept liquid by tidal heating, is a top NASA target in the search for life (Europa Clipper mission).',
            ],
          },
        },
      },
      {
        name: 'Ganymede',
        radius: 0.09,
        orbitRadius: 2.0,
        orbitSpeed: 1.0,
        color: 0x9c8f7a,
        accentColor: 0x746a58,
        style: 'cratered',
        facts: {
          diameterKm: '5,268 km',
          distanceFromPlanetKm: '1,070,000 km',
          orbitalPeriod: '7.15 days',
          blurb: 'The largest moon in the solar system — bigger than the planet Mercury. The only moon known to generate its own magnetic field.',
          weather: {
            headline: 'A magnetic moon with its own private auroras',
            tempRange: '-113°C (warmest, near-equator noon) to -193°C',
            pressure: 'A very thin oxygen atmosphere',
            wind: 'None to speak of',
            notable: [
              'The only moon known to generate its own magnetic field, from a molten iron core — it even has its own faint auroras.',
              'Surface is a patchwork of ancient dark cratered terrain and younger, brighter grooved terrain.',
              'Likely hides a subsurface saltwater ocean sandwiched between layers of ice.',
            ],
          },
        },
      },
      {
        name: 'Callisto',
        radius: 0.08,
        orbitRadius: 2.3,
        orbitSpeed: 0.8,
        color: 0x6e6255,
        accentColor: 0x554b40,
        style: 'cratered',
        facts: {
          diameterKm: '4,821 km',
          distanceFromPlanetKm: '1,883,000 km',
          orbitalPeriod: '16.7 days',
          blurb: 'One of the most heavily cratered surfaces known — it\'s been geologically inactive for billions of years, so nothing has erased the impact scars.',
          weather: {
            headline: 'A dead, ancient, heavily-scarred world',
            tempRange: '-108°C (warmest) to -193°C',
            pressure: 'A trace of carbon dioxide — essentially a vacuum',
            wind: 'None',
            notable: [
              'One of the oldest, most heavily cratered surfaces in the solar system — geologically inactive for billions of years.',
              'Home to the Valhalla basin, a multi-ring impact scar over 3,800 km across.',
              'May also hide a subsurface ocean, though evidence is less certain than for Europa or Ganymede.',
            ],
          },
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
      weather: {
        headline: 'A centuries-old superstorm the size of Earth, still raging',
        tempRange: '~-110°C to -145°C at the visible cloud tops (measured at the "1-bar" reference level, since there\'s no solid surface)',
        pressure: 'Defined by depth, not a surface — pressure and temperature both climb the deeper you go',
        wind: 'Jet-stream bands reach 350-620 km/h; winds inside the Great Red Spot run even faster',
        notable: [
          'The Great Red Spot: a storm 1.3x Earth\'s diameter that has raged for at least 190 years.',
          'Auroras far more powerful than Earth\'s, energized in part by volcanic material from its moon Io.',
          'Lightning storms have been photographed flashing inside the cloud bands.',
          'Ammonia-ice clouds create the colorful banding visible from Earth-based telescopes.',
        ],
      },
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
        accentColor: 0xecc878,
        style: 'hazy',
        facts: {
          diameterKm: '5,150 km — 2nd-largest moon in the solar system',
          distanceFromPlanetKm: '1,222,000 km',
          orbitalPeriod: '15.9 days',
          blurb: 'The only other body in the solar system with stable liquid on its surface — lakes and rivers of liquid methane and ethane, under a thick, hazy nitrogen atmosphere denser than Earth\'s.',
          weather: {
            headline: 'A real, alien weather cycle — just running on methane instead of water',
            tempRange: '~-179°C, fairly stable — cold enough that methane and ethane are liquid',
            pressure: '1.5 bar at the surface — 50% thicker than Earth\'s',
            wind: 'Gentle near the surface, but strong enough aloft to sculpt vast dune fields near the equator',
            notable: [
              'Clouds, rain, rivers, and seas — all made of liquid methane and ethane instead of water.',
              'Kraken Mare, its largest sea, is bigger than the Caspian Sea on Earth.',
              'Thick orange smog-like haze from sunlight reacting with atmospheric methane.',
              'Possible cryovolcanoes erupting water-ice slush instead of molten rock.',
            ],
          },
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
      weather: {
        headline: 'Near-supersonic winds and a permanent hexagon storm at the pole',
        tempRange: '~-140°C to -178°C at the cloud tops',
        pressure: 'Defined by depth, not a surface, like Jupiter',
        wind: 'Equatorial winds reach up to ~1,800 km/h — among the fastest measured on any planet',
        notable: [
          'A bizarre, persistent hexagonal jet-stream pattern circles the north pole, roughly 30,000 km across — observed continuously since Voyager in the 1980s.',
          '"Great White Spot" superstorms erupt roughly once per Saturnian year (~every 30 Earth years).',
          'The rings cast visible shadows on the cloud tops that shift with Saturn\'s seasons.',
        ],
      },
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
      weather: {
        headline: 'The coldest planetary atmosphere in the solar system — and 21-year-long seasons',
        tempRange: '~-195°C typical, with a minimum recorded around -224°C — colder than Neptune, despite being closer to the Sun',
        pressure: 'Defined by depth, not a surface',
        wind: 'Up to ~900 km/h',
        notable: [
          'Colder than Neptune despite being nearer the Sun — its internal heat source is unusually weak.',
          'Extreme 98° tilt means each pole gets 21 straight years of sunlight, then 21 straight years of darkness.',
          'Looked almost featureless to Voyager 2 in 1986, but Hubble and JWST have since caught real storm activity as it nears equinox.',
          'A faint, dark ring system, only discovered in 1977.',
        ],
      },
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
        accentColor: 0xe8c9d4,
        style: 'cantaloupe',
        facts: {
          diameterKm: '2,707 km',
          distanceFromPlanetKm: '354,800 km',
          orbitalPeriod: '5.88 days (retrograde)',
          blurb: 'Orbits backwards relative to Neptune\'s rotation — the only large moon in the solar system that does. Almost certainly a captured Kuiper Belt object, not formed alongside Neptune. Has active nitrogen geysers.',
          weather: {
            headline: 'Erupting nitrogen geysers on one of the coldest surfaces known',
            tempRange: '~-235°C — among the coldest measured surfaces in the solar system',
            pressure: 'A very thin nitrogen atmosphere',
            wind: 'Light, but enough to streak geyser plumes for miles downwind',
            notable: [
              'Active nitrogen geysers erupt up to 8 km high, powered by subsurface nitrogen ice warmed by faint sunlight — discovered by Voyager 2 in 1989.',
              '"Cantaloupe terrain" — an odd, dimpled surface texture unlike anywhere else photographed.',
              'Slowly spiraling inward; in a few billion years tidal forces will likely tear it apart into a ring.',
            ],
          },
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
      weather: {
        headline: 'The windiest world in the solar system, despite the faintest sunlight',
        tempRange: '~-200°C to -218°C at the cloud tops',
        pressure: 'Defined by depth, not a surface',
        wind: 'Up to ~2,100 km/h — supersonic, and the fastest sustained winds of any planet',
        notable: [
          'Why it\'s so windy despite receiving the least sunlight of any planet is still a real, unsolved mystery.',
          'A "Great Dark Spot" storm (similar to Jupiter\'s Red Spot) was seen by Voyager 2 in 1989, then had vanished by 1994 — unlike Jupiter\'s, Neptune\'s dark spots come and go.',
          'Bright, wispy methane-ice clouds cast shadows on the deeper cloud deck below.',
        ],
      },
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
