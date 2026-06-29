import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import { normalizePrismaDatabaseUrl } from "../src/lib/database-url";

loadEnvConfig(process.cwd());

const databaseUrl = normalizePrismaDatabaseUrl();
const prisma = new PrismaClient(
  databaseUrl
    ? {
        datasources: {
          db: { url: databaseUrl },
        },
      }
    : undefined
);

const menuItems = [
  {
    id: "fine-breeze-mixed-grill",
    name: "Fine Breeze Mixed Grill",
    description: "Beef skewers, chicken tikka, sausage, mbuzi chops, kachumbari, and smoky house sauce.",
    price: 320000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80",
    emoji: "GR",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: "mbuzi-nyama-choma",
    name: "Mbuzi Nyama Choma",
    description: "Charcoal-grilled goat, sea salt, kachumbari, ugali, and pili pili on the side.",
    price: 180000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    emoji: "GR",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: "honey-glazed-pork-ribs",
    name: "Honey Glazed Pork Ribs",
    description: "Slow-cooked ribs finished on the grill with honey BBQ glaze and house coleslaw.",
    price: 240000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80",
    emoji: "GR",
    isFeatured: true,
    sortOrder: 3,
  },
  {
    id: "pilipili-chicken-platter",
    name: "Pilipili Chicken Platter",
    description: "Grilled chicken quarter, masala chips, garden salad, and garlic dip.",
    price: 145000,
    category: "GRILL",
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1200&q=80",
    emoji: "GR",
    isFeatured: false,
    sortOrder: 4,
  },
  {
    id: "whole-tilapia-pwani",
    name: "Whole Tilapia Pwani",
    description: "Whole Lake Victoria tilapia, coastal spice rub, coconut rice, and kachumbari.",
    price: 160000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=1200&q=80",
    emoji: "SF",
    isFeatured: true,
    sortOrder: 10,
  },
  {
    id: "garlic-butter-prawns",
    name: "Garlic Butter Prawns",
    description: "Prawns tossed in garlic butter, lemon, coriander, and coconut rice.",
    price: 210000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80",
    emoji: "SF",
    isFeatured: true,
    sortOrder: 11,
  },
  {
    id: "crispy-calamari-basket",
    name: "Crispy Calamari Basket",
    description: "Golden calamari rings with tartar sauce, lemon, and seasoned fries.",
    price: 125000,
    category: "SEAFOOD",
    imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=80",
    emoji: "SF",
    isFeatured: false,
    sortOrder: 12,
  },
  {
    id: "swahili-beef-pilau",
    name: "Swahili Beef Pilau",
    description: "Fragrant pilau rice with tender beef, raisins, fried onions, and tomato salsa.",
    price: 95000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80",
    emoji: "SP",
    isFeatured: true,
    sortOrder: 20,
  },
  {
    id: "coconut-chicken-curry",
    name: "Coconut Chicken Curry",
    description: "Coastal coconut curry with steamed rice, chapati, and fresh coriander.",
    price: 135000,
    category: "SPECIALS",
    imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80",
    emoji: "SP",
    isFeatured: false,
    sortOrder: 21,
  },
  {
    id: "samosa-sharing-platter",
    name: "Samosa Sharing Platter",
    description: "Beef and vegetable samosas served with tamarind chutney and kachumbari.",
    price: 65000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
    emoji: "ST",
    isFeatured: false,
    sortOrder: 30,
  },
  {
    id: "loaded-masala-chips",
    name: "Loaded Masala Chips",
    description: "Crispy chips tossed in masala sauce, cheese, onions, coriander, and house mayo.",
    price: 70000,
    category: "STARTERS",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=80",
    emoji: "ST",
    isFeatured: true,
    sortOrder: 31,
  },
  {
    id: "mango-passion-mocktail",
    name: "Mango Passion Mocktail",
    description: "Fresh mango, passion fruit, lime, mint, and crushed ice.",
    price: 45000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=1200&q=80",
    emoji: "DR",
    isFeatured: true,
    sortOrder: 40,
  },
  {
    id: "fine-breeze-dawa",
    name: "Fine Breeze Dawa",
    description: "Vodka, lime, honey, crushed ice, and a ginger finish.",
    price: 95000,
    category: "DRINKS",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80",
    emoji: "DR",
    isFeatured: true,
    sortOrder: 41,
  },
  {
    id: "tropical-fruit-platter",
    name: "Tropical Fruit Platter",
    description: "Seasonal pineapple, mango, watermelon, passion fruit, and mint syrup.",
    price: 55000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&q=80",
    emoji: "DS",
    isFeatured: false,
    sortOrder: 50,
  },
  {
    id: "warm-brownie-sundae",
    name: "Warm Brownie Sundae",
    description: "Warm chocolate brownie, vanilla ice cream, caramel, and roasted peanuts.",
    price: 75000,
    category: "DESSERTS",
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
    emoji: "DS",
    isFeatured: true,
    sortOrder: 51,
  },
] as const;

const liquorItems = [
  ["BAR-TUSKER-500", "Tusker Lager 500ml", "BEER", 500, 220, 350, 72, 12, "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-WHITECAP-500", "White Cap Lager 500ml", "BEER", 500, 230, 380, 60, 10, "https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-GUINNESS-500", "Guinness Stout 500ml", "BEER", 500, 280, 500, 42, 8, "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-HEINEKEN-330", "Heineken 330ml", "BEER", 330, 300, 500, 36, 8, "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-SAVANNA-330", "Savanna Dry Cider 330ml", "CIDER", 330, 320, 550, 30, 6, "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-HOUSE-RED-175", "House Red Wine 175ml", "WINE", 175, 420, 900, 28, 6, "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-HOUSE-WHITE-175", "House White Wine 175ml", "WINE", 175, 420, 900, 26, 6, "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-NEDERBURG-750", "Nederburg Cabernet Sauvignon 750ml", "WINE", 750, 1800, 3500, 12, 3, "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-JAMESON-35", "Jameson Irish Whiskey 35ml", "WHISKEY", 35, 320, 800, 48, 8, "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-JW-BLACK-35", "Johnnie Walker Black Label 35ml", "WHISKEY", 35, 450, 950, 36, 6, "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-GILBEYS-35", "Gilbey's Gin 35ml", "GIN", 35, 220, 550, 45, 8, "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-SMIRNOFF-35", "Smirnoff Vodka 35ml", "VODKA", 35, 240, 600, 42, 8, "https://images.unsplash.com/photo-1605270012917-bf157c5a9541?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-CAPTAIN-35", "Captain Morgan Spiced Rum 35ml", "RUM", 35, 260, 700, 34, 6, "https://images.unsplash.com/photo-1587223962930-cb7f31384c19?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-OLMECA-35", "Olmeca Tequila Silver 35ml", "TEQUILA", 35, 310, 800, 24, 5, "https://images.unsplash.com/photo-1605270012917-bf157c5a9541?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-DAWA-300", "Fine Breeze Dawa Cocktail", "VODKA", 300, 420, 950, 30, 6, "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-MOJITO-300", "Classic Mojito", "RUM", 300, 480, 1100, 24, 5, "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-LONGISLAND-300", "Long Island Iced Tea", "LIQUEUR", 300, 560, 1200, 18, 4, "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80"],
  ["BAR-MOET-750", "Moet and Chandon Brut 750ml", "CHAMPAGNE", 750, 11800, 18500, 6, 2, "https://images.unsplash.com/photo-1594372365401-3b5ff14eaaed?auto=format&fit=crop&w=1200&q=80"],
] as const;

const rooms = [
  {
    id: "savanna-suite",
    name: "The Savanna Suite",
    description: "Spacious suite with king bed, lounge corner, balcony, premium linens, and city views.",
    pricePerNight: 1850000,
    capacity: 2,
    amenities: ["King Bed", "Balcony", "City View", "Breakfast", "WiFi", "Air Conditioning", "Mini Bar"],
    imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
    emoji: "RM",
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: "breeze-deluxe",
    name: "Breeze Deluxe Room",
    description: "Warm deluxe room for business and weekend stays, with garden views and breakfast.",
    pricePerNight: 980000,
    capacity: 2,
    amenities: ["Queen Bed", "Garden View", "Breakfast", "WiFi", "Smart TV", "Hot Shower"],
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    emoji: "RM",
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: "family-comfort-room",
    name: "Family Comfort Room",
    description: "Two double beds, extra seating, quiet lighting, and enough room for a family stay.",
    pricePerNight: 1350000,
    capacity: 4,
    amenities: ["Two Double Beds", "Breakfast", "WiFi", "Kids Welcome", "Smart TV", "Air Conditioning"],
    imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    emoji: "RM",
    isAvailable: true,
    sortOrder: 3,
  },
] as const;

const gallery = [
  ["gallery-fine-breeze-grill", "Charcoal grill service", "Nyama choma, ribs, and platters coming fresh off the grill.", "Dining", 1, "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1400&q=80"],
  ["gallery-fine-breeze-seafood", "Seafood lunch", "Whole tilapia, prawns, coconut rice, and coastal spice.", "Dining", 2, "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=1400&q=80"],
  ["gallery-fine-breeze-bar", "Bar counter", "Cold beers, cocktails, wines, and premium spirits.", "Bar", 3, "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1400&q=80"],
  ["gallery-fine-breeze-cocktails", "Cocktail hour", "Dawa, mojito, and signature house cocktails for the evening crowd.", "Bar", 4, "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=1400&q=80"],
  ["gallery-fine-breeze-room", "Guest rooms", "Clean, calm rooms for overnight stays and weekend breaks.", "Rooms", 5, "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80"],
  ["gallery-fine-breeze-event", "Weekend events", "Live music, private dinners, birthdays, and corporate evenings.", "Events", 6, "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80"],
] as const;

async function seedMenu() {
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }
  console.log(`Menu items ready: ${menuItems.length}`);
}

async function seedLiquor() {
  for (const [sku, name, category, bottleSizeMl, costPrice, retailPrice, currentStock, lowStockThreshold, imageUrl] of liquorItems) {
    await prisma.liquorItem.upsert({
      where: { sku },
      update: {
        name,
        category,
        bottleSizeMl,
        costPrice,
        retailPrice,
        currentStock,
        lowStockThreshold,
        imageUrl,
        status: "ACTIVE",
      },
      create: {
        sku,
        name,
        category,
        bottleSizeMl,
        costPrice,
        retailPrice,
        currentStock,
        lowStockThreshold,
        imageUrl,
        status: "ACTIVE",
      },
    });
  }
  console.log(`Liquor items ready: ${liquorItems.length}`);
}

async function seedRooms() {
  for (const room of rooms) {
    const data = { ...room, amenities: [...room.amenities] };
    await prisma.room.upsert({
      where: { id: room.id },
      update: data,
      create: data,
    });
  }
  console.log(`Rooms ready: ${rooms.length}`);
}

async function seedGallery() {
  for (const [id, title, caption, category, sortOrder, imageUrl] of gallery) {
    await prisma.galleryImage.upsert({
      where: { id },
      update: {
        title,
        caption,
        category,
        sortOrder,
        imageUrl,
        isPublished: true,
      },
      create: {
        id,
        title,
        caption,
        category,
        sortOrder,
        imageUrl,
        isPublished: true,
      },
    });
  }
  console.log(`Gallery images ready: ${gallery.length}`);
}

async function main() {
  console.log("Preparing Fine Breeze demo content...");
  await seedMenu();
  await seedLiquor();
  await seedRooms();
  await seedGallery();
  console.log("Fine Breeze demo content is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
