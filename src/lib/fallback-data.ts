import type { Event, MenuItem, Room } from "@/types";

type DemoLiquorGroup = "BEERS" | "SPIRITS" | "WINES" | "COCKTAILS";

export type DemoLiquorItem = MenuItem & {
  liquorCategory: DemoLiquorGroup;
  serveSize: string;
  ageRestricted: true;
};

export type DemoAnalyticsRow = {
  month: string;
  foodRevenue: number;
  roomRevenue: number;
  ticketRevenue: number;
  orders: number;
  bookings: number;
  tickets: number;
};

export type DemoActivity = {
  text: string;
  time: string;
  type: "order" | "booking" | "ticket" | "admin" | "payment" | "kitchen" | "user";
};

export type DemoStats = {
  totalRevenue30d: number;
  revenueChange: number;
  ordersToday: number;
  pendingOrders: number;
  confirmedBookings: number;
  roomsOccupied: number;
  totalRooms: number;
  occupancyRate: number;
  ticketsSoldThisMonth: number;
  ticketRevenue30d: number;
  avgOrderValue: number;
  topSellingItem: string;
  topSellingCount: number;
  totalCustomers: number;
  newCustomers30d: number;
  recentActivity: DemoActivity[];
};

const nowIso = () => new Date().toISOString();

function withTimestamps<T extends object>(item: T) {
  const now = nowIso();
  return { ...item, createdAt: now, updatedAt: now };
}

function futureIso(days: number, hour = 19, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function nextSundayIso(hour = 11) {
  const date = new Date();
  const daysUntilSunday = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function newYearsEveIso() {
  const now = new Date();
  let year = now.getFullYear();
  const date = new Date(year, 11, 31, 20, 0, 0, 0);
  if (date <= now) {
    year += 1;
    date.setFullYear(year);
  }
  return date.toISOString();
}

export const demoMenuItems: MenuItem[] = [
  withTimestamps({
    id: "nyama-choma-goat",
    name: "Nyama Choma Goat",
    description: "Slow-roasted Kenyan goat marinated in traditional herbs, served with kachumbari and ugali.",
    price: 180000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 1,
  }),
  withTimestamps({
    id: "nyama-choma-beef-ribs",
    name: "Nyama Choma Beef Ribs",
    description: "Smoky beef ribs rubbed with garlic and rosemary, charcoal-grilled until tender.",
    price: 220000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 2,
  }),
  withTimestamps({
    id: "whole-tilapia-grill",
    name: "Whole Tilapia",
    description: "Fresh Lake Victoria tilapia, spiced and grilled whole, served with chapati and coleslaw.",
    price: 140000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 3,
  }),
  withTimestamps({
    id: "chicken-quarter-pilipili",
    name: "Chicken Quarter",
    description: "Free-range chicken with lemon and pilipili marinade, served with hand-cut fries.",
    price: 95000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 4,
  }),
  withTimestamps({
    id: "lamb-chops-mint",
    name: "Lamb Chops",
    description: "New Zealand lamb chops with mint sauce, grilled vegetables, and rosemary jus.",
    price: 260000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 5,
  }),
  withTimestamps({
    id: "smoky-pork-ribs",
    name: "Pork Ribs",
    description: "Baby back ribs with smoky BBQ glaze, slow-cooked for four hours.",
    price: 160000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 6,
  }),
  withTimestamps({
    id: "t-bone-steak-400g",
    name: "T-Bone Steak 400g",
    description: "Premium grain-fed T-bone with mushroom sauce and roasted potatoes.",
    price: 320000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 7,
  }),
  withTimestamps({
    id: "mixed-grill-platter",
    name: "Mixed Grill Platter",
    description: "Goat, beef, chicken, sausage, sauces, and sides for two to three guests.",
    price: 450000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1000&q=80",
    emoji: "GR",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 8,
  }),
  withTimestamps({
    id: "samosa-4pcs",
    name: "Samosa 4pcs",
    description: "Crisp beef or vegetable samosas with tamarind sauce.",
    price: 45000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 9,
  }),
  withTimestamps({
    id: "chicken-wings-6pcs",
    name: "Chicken Wings 6pcs",
    description: "Peri-peri marinated wings, oven-baked then fried for a crisp finish.",
    price: 75000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=1000&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 10,
  }),
  withTimestamps({
    id: "calamari-rings",
    name: "Calamari Rings",
    description: "Lightly battered squid rings with garlic aioli and lemon.",
    price: 85000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1000&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 11,
  }),
  withTimestamps({
    id: "soup-of-the-day",
    name: "Soup of the Day",
    description: "Freshly prepared soup with warm bread rolls. Ask your server for today's flavor.",
    price: 55000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 12,
  }),
  withTimestamps({
    id: "beef-sliders-3pcs",
    name: "Beef Sliders 3pcs",
    description: "Mini burgers with pickled onions, truffle mayo, and a toasted brioche bun.",
    price: 90000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80",
    emoji: "ST",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 13,
  }),
  withTimestamps({
    id: "grilled-prawns-500g",
    name: "Grilled Prawns 500g",
    description: "Tiger prawns with garlic butter, white wine sauce, and herb rice.",
    price: 280000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1000&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 14,
  }),
  withTimestamps({
    id: "lobster-thermidor",
    name: "Lobster Thermidor",
    description: "Half lobster with brandy cream sauce, gruyere, herbs, and lemon.",
    price: 550000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1000&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 15,
  }),
  withTimestamps({
    id: "fish-and-chips",
    name: "Fish and Chips",
    description: "Battered Nile perch, thick-cut fries, tartare sauce, and malt vinegar.",
    price: 110000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=1000&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 16,
  }),
  withTimestamps({
    id: "seafood-pasta",
    name: "Seafood Pasta",
    description: "Spaghetti with prawns, calamari, mussels, and white-wine tomato sauce.",
    price: 180000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 17,
  }),
  withTimestamps({
    id: "crab-claws-4pcs",
    name: "Crab Claws 4pcs",
    description: "Steamed blue crab claws with drawn butter, lemon, and coastal spice.",
    price: 320000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1000&q=80",
    emoji: "SF",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 18,
  }),
  withTimestamps({
    id: "chocolate-lava-cake",
    name: "Chocolate Lava Cake",
    description: "Molten dark chocolate cake with vanilla ice cream.",
    price: 75000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=80",
    emoji: "DS",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 19,
  }),
  withTimestamps({
    id: "mango-cheesecake",
    name: "Mango Cheesecake",
    description: "Kenyan mango on a vanilla cheesecake base with passion fruit glaze.",
    price: 65000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1000&q=80",
    emoji: "DS",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 20,
  }),
  withTimestamps({
    id: "ice-cream-3-scoops",
    name: "Ice Cream 3 Scoops",
    description: "Vanilla, chocolate, strawberry, or passion fruit ice cream.",
    price: 50000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1000&q=80",
    emoji: "DS",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 21,
  }),
  withTimestamps({
    id: "maandazi-and-chai",
    name: "Maandazi and Chai",
    description: "House-made maandazi with Kenyan masala chai.",
    price: 35000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1000&q=80",
    emoji: "DS",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 22,
  }),
  withTimestamps({
    id: "fresh-passion-juice",
    name: "Fresh Passion Juice",
    description: "Freshly squeezed passion fruit juice, lightly sweetened.",
    price: 35000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1000&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 23,
  }),
  withTimestamps({
    id: "dawa-mocktail",
    name: "Dawa Mocktail",
    description: "Lime, honey, ginger, and crushed ice. Bright and alcohol-free.",
    price: 45000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1000&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 24,
  }),
  withTimestamps({
    id: "mineral-water-500ml",
    name: "Mineral Water 500ml",
    description: "Still or sparkling mineral water, served chilled.",
    price: 15000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 25,
  }),
  withTimestamps({
    id: "sodas-330ml",
    name: "Sodas 330ml",
    description: "Coca-Cola, Fanta, Sprite, or Stoney, served ice cold.",
    price: 20000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=1000&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 26,
  }),
  withTimestamps({
    id: "fresh-watermelon-juice",
    name: "Fresh Watermelon Juice",
    description: "Cold-pressed watermelon juice with mint.",
    price: 38000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=1000&q=80",
    emoji: "DR",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 27,
  }),
  withTimestamps({
    id: "sunday-roast",
    name: "Sunday Roast",
    description: "Slow-roasted leg of lamb, Yorkshire pudding, gravy, and seasonal vegetables.",
    price: 280000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 28,
  }),
  withTimestamps({
    id: "friday-fish-fry",
    name: "Friday Fish Fry",
    description: "Whole fried tilapia with pilipili sauce, lime, and kachumbari.",
    price: 160000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1579208030886-b937da0925dc?auto=format&fit=crop&w=1000&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 29,
  }),
  withTimestamps({
    id: "chefs-tasting-menu",
    name: "Chef's Tasting Menu",
    description: "Five-course tasting menu built around seasonal Kenyan ingredients.",
    price: 650000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 30,
  }),
  withTimestamps({
    id: "nyama-choma-sunday-buffet",
    name: "Nyama Choma Sunday Buffet",
    description: "All-you-can-eat grill every Sunday noon to 4pm.",
    price: 350000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1000&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: true,
    sortOrder: 31,
  }),
  withTimestamps({
    id: "date-night-package",
    name: "Date Night Package",
    description: "Three-course dinner for two with wine pairing and dessert platter.",
    price: 800000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=80",
    emoji: "SP",
    isAvailable: true,
    isFeatured: false,
    sortOrder: 32,
  }),
];

export function getLiquorItems(): DemoLiquorItem[] {
  const base = [
    ["tusker-lager-500ml", "Tusker Lager 500ml", "Kenya's iconic lager, crisp and golden.", 35000, "BEERS", "500ml", true],
    ["tusker-malt-500ml", "Tusker Malt 500ml", "Premium malt lager with a richer body.", 38000, "BEERS", "500ml", false],
    ["white-cap-lager-500ml", "White Cap Lager 500ml", "Light and refreshing Kenyan lager.", 35000, "BEERS", "500ml", false],
    ["heineken-330ml", "Heineken 330ml", "Dutch premium lager, imported.", 45000, "BEERS", "330ml", false],
    ["guinness-500ml", "Guinness 500ml", "Classic Irish stout, served cold.", 50000, "BEERS", "500ml", false],
    ["balozi-lager-500ml", "Balozi Lager 500ml", "Smooth, affordable Kenyan lager.", 28000, "BEERS", "500ml", false],
    ["corona-extra-330ml", "Corona Extra 330ml", "Mexican lager, best served with lime.", 50000, "BEERS", "330ml", false],
    ["kingfisher-330ml", "Kingfisher 330ml", "Indian premium lager with a clean finish.", 42000, "BEERS", "330ml", false],
    ["johnnie-walker-red-35ml", "Johnnie Walker Red Label", "Blended Scotch whisky served as a tot.", 65000, "SPIRITS", "35ml", false],
    ["johnnie-walker-black-35ml", "Johnnie Walker Black Label", "Aged 12 years, smooth and smoky.", 95000, "SPIRITS", "35ml", false],
    ["jameson-irish-whiskey-35ml", "Jameson Irish Whiskey", "Triple-distilled Irish whiskey.", 80000, "SPIRITS", "35ml", false],
    ["captain-morgan-spiced-rum-35ml", "Captain Morgan Spiced Rum", "Caribbean rum with warm spice notes.", 70000, "SPIRITS", "35ml", false],
    ["smirnoff-vodka-35ml", "Smirnoff Vodka", "Triple-distilled vodka, clean and smooth.", 60000, "SPIRITS", "35ml", false],
    ["gilbeys-gin-35ml", "Gilbeys Gin", "Classic London dry gin.", 55000, "SPIRITS", "35ml", false],
    ["olmeca-tequila-35ml", "Olmeca Tequila", "Silver tequila made from blue agave.", 75000, "SPIRITS", "35ml", false],
    ["house-red-wine-175ml", "House Red Wine 175ml", "Ask your server for today's red selection.", 90000, "WINES", "175ml", false],
    ["house-white-wine-175ml", "House White Wine 175ml", "Chilled, crisp, and food-friendly.", 90000, "WINES", "175ml", false],
    ["nederburg-cabernet-750ml", "Nederburg Cabernet Sauvignon 750ml", "South African red with dark fruit and structure.", 350000, "WINES", "750ml", false],
    ["drostdy-hof-chenin-750ml", "Drostdy-Hof Chenin Blanc 750ml", "South African white, fresh and fruity.", 320000, "WINES", "750ml", false],
    ["moet-chandon-750ml", "Moet and Chandon Champagne 750ml", "French champagne for celebrations.", 1850000, "WINES", "750ml", true],
    ["dawa-cocktail-bar", "Dawa", "Kenyan classic with vodka, lime, honey, and ginger.", 95000, "COCKTAILS", "glass", true],
    ["long-island-iced-tea", "Long Island Iced Tea", "Five spirits, cola, and lemon.", 120000, "COCKTAILS", "glass", false],
    ["mojito", "Mojito", "White rum, mint, lime, and soda.", 110000, "COCKTAILS", "glass", false],
    ["cosmopolitan", "Cosmopolitan", "Vodka, triple sec, cranberry, and lime.", 105000, "COCKTAILS", "glass", false],
    ["espresso-martini", "Espresso Martini", "Vodka, coffee liqueur, and fresh espresso.", 120000, "COCKTAILS", "glass", false],
  ] as const;

  return base.map(([id, name, description, price, liquorCategory, serveSize, isFeatured], index) =>
    withTimestamps({
      id,
      name,
      description,
      price,
      category: "DRINKS",
      liquorCategory,
      serveSize,
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1000&q=80",
      emoji: liquorCategory === "BEERS" ? "BR" : liquorCategory === "SPIRITS" ? "SP" : liquorCategory === "WINES" ? "WN" : "CK",
      isAvailable: true,
      isFeatured,
      sortOrder: 100 + index,
      ageRestricted: true,
    })
  );
}

export const demoRooms: Room[] = [
  withTimestamps({
    id: "savanna-suite",
    name: "The Savanna Suite",
    description: "Spacious 65sqm suite with panoramic Nairobi city views, king bed, marble bathroom, soaking tub, and private balcony.",
    pricePerNight: 1850000,
    capacity: 2,
    amenities: ["King Bed", "City View", "Soaking Tub", "Balcony", "Free WiFi", "Air Conditioning", "Smart TV", "Room Service", "Mini Bar", "Safe"],
    imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
    emoji: "ST",
    isAvailable: true,
    sortOrder: 1,
  }),
  withTimestamps({
    id: "breeze-deluxe",
    name: "The Breeze Deluxe",
    description: "Modern 45sqm room with garden views, queen bed, rainfall shower, and complimentary breakfast for two.",
    pricePerNight: 1250000,
    capacity: 2,
    amenities: ["Queen Bed", "Garden View", "Rainfall Shower", "Breakfast Included", "Free WiFi", "Air Conditioning", "Smart TV", "Work Desk"],
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    emoji: "BD",
    isAvailable: true,
    sortOrder: 2,
  }),
  withTimestamps({
    id: "serengeti-room",
    name: "The Serengeti Room",
    description: "Safari-themed 38sqm room with handcrafted Kenyan furniture and warm earthy tones.",
    pricePerNight: 980000,
    capacity: 2,
    amenities: ["Double Bed", "Free WiFi", "Air Conditioning", "Smart TV", "En-suite Bathroom", "Room Service"],
    imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    emoji: "SR",
    isAvailable: true,
    sortOrder: 3,
  }),
  withTimestamps({
    id: "family-retreat",
    name: "Family Retreat",
    description: "Generous 80sqm two-bedroom family suite with lounge, kitchenette, and kid-friendly amenities.",
    pricePerNight: 2200000,
    capacity: 4,
    amenities: ["2 Bedrooms", "2 Bathrooms", "Kitchenette", "Lounge Area", "Free WiFi", "Air Conditioning", "Kids Amenities", "Cot Available"],
    imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    emoji: "FM",
    isAvailable: true,
    sortOrder: 4,
  }),
  withTimestamps({
    id: "penthouse",
    name: "The Penthouse",
    description: "A 120sqm rooftop penthouse with private plunge pool, butler service, and 360 degree Nairobi skyline views.",
    pricePerNight: 4500000,
    capacity: 2,
    amenities: ["Private Plunge Pool", "Butler Service", "360 Degree Views", "King Bed", "Jacuzzi", "Full Kitchen", "Dining Area", "Airport Transfer"],
    imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    emoji: "PH",
    isAvailable: true,
    sortOrder: 5,
  }),
  withTimestamps({
    id: "poolside-cabana",
    name: "The Poolside Cabana",
    description: "Charming 30sqm room with direct pool access, twin beds, and private terrace.",
    pricePerNight: 850000,
    capacity: 2,
    amenities: ["Pool Access", "Private Terrace", "Twin Beds", "Free WiFi", "Air Conditioning"],
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80",
    emoji: "PC",
    isAvailable: true,
    sortOrder: 6,
  }),
  withTimestamps({
    id: "executive-business-room",
    name: "Executive Business Room",
    description: "Optimized for business with a large work desk, dual monitors, high-speed fiber, and same-day laundry.",
    pricePerNight: 1100000,
    capacity: 1,
    amenities: ["King Bed", "Dual Monitors", "Fibre WiFi", "Work Desk", "Same-Day Laundry", "Airport Transfer", "Breakfast Included"],
    imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    emoji: "EX",
    isAvailable: true,
    sortOrder: 7,
  }),
  withTimestamps({
    id: "karibu-studio",
    name: "The Karibu Studio",
    description: "Compact and beautifully designed studio with a double bed, en-suite bathroom, WiFi, AC, and smart TV.",
    pricePerNight: 720000,
    capacity: 2,
    amenities: ["Double Bed", "En-suite Bathroom", "Free WiFi", "Air Conditioning", "Smart TV"],
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
    emoji: "KS",
    isAvailable: true,
    sortOrder: 8,
  }),
];

export function getDemoEvents(): Event[] {
  return [
    withTimestamps({
      id: "afrobeats-night",
      title: "Afrobeats Night",
      description: "Nairobi's hottest DJs bring Afrobeats, Amapiano, and Afro House. Doors open at 8PM.",
      date: futureIso(14, 21),
      venue: "Fine Breeze Main Bar",
      ticketPrice: 150000,
      totalSeats: 300,
      soldSeats: 187,
      imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "wine-and-jazz-evening",
      title: "Wine and Jazz Evening",
      description: "Intimate jazz quartet with a three-course wine-pairing dinner. Limited seats.",
      date: futureIso(21, 19),
      venue: "Fine Breeze Garden Terrace",
      ticketPrice: 350000,
      totalSeats: 80,
      soldSeats: 45,
      imageUrl: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "nyama-choma-festival",
      title: "Nyama Choma Festival",
      description: "All-day barbecue festival with live cooking demos, craft beer garden, and traditional music.",
      date: futureIso(28, 12),
      venue: "Fine Breeze Courtyard",
      ticketPrice: 250000,
      totalSeats: 500,
      soldSeats: 312,
      imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "comedy-night",
      title: "Comedy Night",
      description: "Kenya's top comedians for a night of laughter, food, and drinks.",
      date: futureIso(35, 20),
      venue: "Fine Breeze Event Hall",
      ticketPrice: 200000,
      totalSeats: 200,
      soldSeats: 156,
      imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "new-years-eve-gala",
      title: "New Year's Eve Gala",
      description: "Four-course gala dinner, live band, midnight champagne toast, and fireworks.",
      date: newYearsEveIso(),
      venue: "Fine Breeze Ballroom",
      ticketPrice: 850000,
      totalSeats: 250,
      soldSeats: 201,
      imageUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "spoken-word-poetry-slam",
      title: "Spoken Word and Poetry Slam",
      description: "East African voices, poetry, short stories, and open mic performances.",
      date: futureIso(42, 19),
      venue: "Fine Breeze Lounge",
      ticketPrice: 80000,
      totalSeats: 100,
      soldSeats: 23,
      imageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "sunday-brunch-and-beats",
      title: "Sunday Brunch and Beats",
      description: "Live acoustic music, bottomless mimosas, and the house brunch spread.",
      date: nextSundayIso(11),
      venue: "Fine Breeze Garden Terrace",
      ticketPrice: 120000,
      totalSeats: 150,
      soldSeats: 89,
      imageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
    withTimestamps({
      id: "kids-cooking-class",
      title: "Kids Cooking Class",
      description: "Fun supervised cooking for children aged 6 to 14. Equipment provided; parents welcome.",
      date: futureIso(21, 10),
      venue: "Fine Breeze Demo Kitchen",
      ticketPrice: 150000,
      totalSeats: 30,
      soldSeats: 18,
      imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    }),
  ];
}

export function getDemoAnalytics(): DemoAnalyticsRow[] {
  return [
    { month: "Jan", foodRevenue: 4200000, roomRevenue: 11800000, ticketRevenue: 2400000, orders: 284, bookings: 25, tickets: 154 },
    { month: "Feb", foodRevenue: 3600000, roomRevenue: 9200000, ticketRevenue: 1800000, orders: 241, bookings: 20, tickets: 118 },
    { month: "Mar", foodRevenue: 3900000, roomRevenue: 10100000, ticketRevenue: 2100000, orders: 263, bookings: 22, tickets: 136 },
    { month: "Apr", foodRevenue: 2800000, roomRevenue: 6800000, ticketRevenue: 1200000, orders: 198, bookings: 15, tickets: 84 },
    { month: "May", foodRevenue: 3000000, roomRevenue: 7200000, ticketRevenue: 1350000, orders: 207, bookings: 16, tickets: 92 },
    { month: "Jun", foodRevenue: 3500000, roomRevenue: 8500000, ticketRevenue: 1700000, orders: 236, bookings: 19, tickets: 112 },
    { month: "Jul", foodRevenue: 4100000, roomRevenue: 9800000, ticketRevenue: 2300000, orders: 276, bookings: 23, tickets: 149 },
    { month: "Aug", foodRevenue: 4600000, roomRevenue: 12200000, ticketRevenue: 2900000, orders: 304, bookings: 29, tickets: 178 },
    { month: "Sep", foodRevenue: 3700000, roomRevenue: 9400000, ticketRevenue: 2000000, orders: 252, bookings: 21, tickets: 131 },
    { month: "Oct", foodRevenue: 4000000, roomRevenue: 10300000, ticketRevenue: 2200000, orders: 269, bookings: 23, tickets: 143 },
    { month: "Nov", foodRevenue: 4300000, roomRevenue: 10900000, ticketRevenue: 2600000, orders: 291, bookings: 25, tickets: 166 },
    { month: "Dec", foodRevenue: 4800000, roomRevenue: 12500000, ticketRevenue: 3200000, orders: 312, bookings: 28, tickets: 187 },
  ];
}

export function getDemoStats(): DemoStats {
  return {
    totalRevenue30d: 28450000,
    revenueChange: 12.4,
    ordersToday: 7,
    pendingOrders: 3,
    confirmedBookings: 4,
    roomsOccupied: 6,
    totalRooms: 8,
    occupancyRate: 73,
    ticketsSoldThisMonth: 634,
    ticketRevenue30d: 9510000,
    avgOrderValue: 187500,
    topSellingItem: "Nyama Choma Goat",
    topSellingCount: 86,
    totalCustomers: 1847,
    newCustomers30d: 143,
    recentActivity: [
      { text: "John M. placed an order for KES 3,400", time: "2 min ago", type: "order" },
      { text: "Sarah K. booked The Savanna Suite for 2 nights", time: "14 min ago", type: "booking" },
      { text: "Admin updated Penthouse room price", time: "1 hr ago", type: "admin" },
      { text: "3 tickets sold for Afrobeats Night", time: "2 hrs ago", type: "ticket" },
      { text: "M-Pesa payment confirmed - KES 18,500", time: "3 hrs ago", type: "payment" },
      { text: "David O. registered as a new customer", time: "4 hrs ago", type: "user" },
      { text: "Kitchen marked order MS-ORD-0047 as Ready", time: "5 hrs ago", type: "kitchen" },
      { text: "New event added: Kids Cooking Class", time: "yesterday", type: "admin" },
    ],
  };
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
