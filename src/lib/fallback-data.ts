import type { Event, MenuItem, Room } from "@/types";

const nowIso = () => new Date().toISOString();

function futureIso(days: number, hour = 19) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const demoMenuItems: MenuItem[] = [
  {
    id: "nyama-choma",
    name: "Nyama Choma",
    description: "Slow-grilled beef ribs with kachumbari, ugali, and house chili.",
    price: 120000,
    category: "GRILL",
    imageUrl:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "chicken-tikka",
    name: "Chicken Tikka",
    description: "Charred tandoori chicken, coriander yoghurt, lime, and pilau rice.",
    price: 88000,
    category: "GRILL",
    imageUrl:
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 2,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "tilapia-ya-pwani",
    name: "Tilapia ya Pwani",
    description: "Whole tilapia with coastal spices, coconut rice, and tomato relish.",
    price: 95000,
    category: "SEAFOOD",
    imageUrl:
      "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=900&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 3,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "mixed-grill-platter",
    name: "Mixed Grill Platter",
    description: "Beef, chicken, sausage, prawns, and sauces for two guests.",
    price: 220000,
    category: "GRILL",
    imageUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 4,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "dawa-cocktail",
    name: "Dawa Cocktail",
    description: "Vodka, lime, honey, and ginger over crushed ice.",
    price: 65000,
    category: "DRINKS",
    imageUrl:
      "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 5,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "samosa-platter-6pc",
    name: "Samosa Platter",
    description: "Six crisp beef or vegetable samosas with mint chutney.",
    price: 45000,
    category: "STARTERS",
    imageUrl:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 6,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "vegetable-pilau",
    name: "Vegetable Pilau",
    description: "Aromatic basmati rice with seasonal vegetables and warm spices.",
    price: 42000,
    category: "SPECIALS",
    imageUrl:
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 7,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "mandazi-and-chai",
    name: "Mandazi and Chai",
    description: "Warm Swahili doughnuts with spiced Kenyan tea.",
    price: 30000,
    category: "DESSERTS",
    imageUrl:
      "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=900&q=80",
    emoji: "DS",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 8,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export const demoRooms: Room[] = [
  {
    id: "standard-room",
    name: "Standard Room",
    description: "A calm queen room for short business stays and relaxed weekends.",
    pricePerNight: 450000,
    capacity: 2,
    amenities: ["Breakfast", "WiFi", "Air conditioning", "Hot shower", "Smart TV"],
    imageUrl:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
    emoji: "RM",
    isAvailable: true,
    sortOrder: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "deluxe-garden-view",
    name: "Deluxe Garden View",
    description: "A bright garden-facing room with a generous work desk and mini bar.",
    pricePerNight: 680000,
    capacity: 2,
    amenities: ["Breakfast", "WiFi", "Garden view", "Mini bar", "Air conditioning"],
    imageUrl:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    emoji: "RM",
    isAvailable: true,
    sortOrder: 2,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "executive-suite",
    name: "Executive Suite",
    description: "Separate lounge, king bed, premium bath, and late checkout on request.",
    pricePerNight: 1250000,
    capacity: 3,
    amenities: ["Breakfast", "WiFi", "Lounge", "Jacuzzi", "Butler service"],
    imageUrl:
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    emoji: "ST",
    isAvailable: true,
    sortOrder: 3,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "family-room",
    name: "Family Room",
    description: "Two double beds and practical storage for families visiting Nairobi.",
    pricePerNight: 820000,
    capacity: 4,
    amenities: ["Breakfast", "WiFi", "Two double beds", "Kids welcome", "Smart TV"],
    imageUrl:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    emoji: "FM",
    isAvailable: true,
    sortOrder: 4,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export function getDemoEvents(): Event[] {
  return [
    {
      id: "jazz-&-nyama-night",
      title: "Jazz and Nyama Night",
      description: "Live jazz, grill specials, and a polished Friday night crowd.",
      date: futureIso(5, 20),
      venue: "Fine Breeze Garden Terrace",
      ticketPrice: 150000,
      totalSeats: 80,
      soldSeats: 47,
      imageUrl:
        "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "trivia-friday",
      title: "Trivia Friday",
      description: "Six fast rounds, team prizes, cocktails, and late-night bites.",
      date: futureIso(12, 19),
      venue: "Fine Breeze Main Bar",
      ticketPrice: 50000,
      totalSeats: 120,
      soldSeats: 24,
      imageUrl:
        "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: "heritage-beer-festival",
      title: "Heritage Beer Festival",
      description: "Local brews, food pairings, guest DJs, and tasting flights.",
      date: futureIso(20, 16),
      venue: "Fine Breeze Courtyard",
      ticketPrice: 120000,
      totalSeats: 200,
      soldSeats: 134,
      imageUrl:
        "https://images.unsplash.com/photo-1532634733-cae1395e440f?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
}

export function menuSeedData() {
  return demoMenuItems.map(({ createdAt, updatedAt, ...item }) => item);
}

export function roomSeedData() {
  return demoRooms.map(({ createdAt, updatedAt, ...room }) => room);
}

export function eventSeedData() {
  return getDemoEvents().map(({ createdAt, updatedAt, ...event }) => ({
    ...event,
    date: new Date(event.date),
  }));
}
