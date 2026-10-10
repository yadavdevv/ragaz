// Ragamala paintings: each raga painted as a scene of its mood and hour.
// Images from museum open-access collections; credits shown wherever they appear.

export type Painting = { src: string; title: string; place: string; date: string; museum: string; credit: string; licence: string; url: string; note: string };

export const PAINTINGS: Record<string, Painting> = {
  malkauns: {
    src: "/art/malkauns.jpg",
    title: "Malkos Raga",
    place: "Rajasthan, Marwar",
    date: "c. 1640–50",
    museum: "The Metropolitan Museum of Art",
    credit: "Rogers Fund, 1955",
    licence: "Public domain (CC0)",
    url: "https://www.metmuseum.org/art/collection/search/37897",
    note: "A lord listens as women play for him late at night; one holds a tanpura. The inscription names the raga.",
  },
  bhupali: {
    src: "/art/bhupali.jpg",
    title: "Bhupala Raga, from a Ragamala",
    place: "India",
    date: "c. 1750",
    museum: "Rijksmuseum, Amsterdam",
    credit: "RP-T-2024-57",
    licence: "Public domain",
    url: "https://www.rijksmuseum.nl/en/collection/object/Bhupala-Raga--5c3fdbf173e328884b5d86311a3cb411",
    note: "A ruler under a canopy at nightfall, attended by whisk-bearers. Verses from the Ragasagara run along the top.",
  },
  yaman: {
    src: "/art/yaman.jpg",
    title: "Kalyan Ragini",
    place: "Hyderabad",
    date: "c. 1830",
    museum: "Victoria and Albert Museum, London",
    credit: "IS.280-1951",
    licence: "© V&A, non-commercial use",
    url: "https://collections.vam.ac.uk/item/O71201/",
    note: "Evening on a terrace: a lamp is lit under a crescent moon. Yaman belongs to the Kalyan family of ragas.",
  },
};
