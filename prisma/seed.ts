import { PrismaClient, MenuCategory, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/passwords";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MshindiServe database...");

  // ── Users ────────────────────────────────────────────────────────────────
  const adminHash = await hashPassword("Admin@123!");
  const staffHash = await hashPassword("Staff@123!");
  const userHash = await hashPassword("User@123!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@mshindiServe.ke" },
    update: { passwordHash: adminHash },
    create: {
      name: "System Admin",
      email: "admin@mshindiServe.ke",
      phone: "+254700000001",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  const kitchen = await prisma.user.upsert({
    where: { email: "kitchen@mshindiServe.ke" },
    update: { passwordHash: staffHash },
    create: {
      name: "Brian Otieno",
      email: "kitchen@mshindiServe.ke",
      phone: "+254700000002",
      passwordHash: staffHash,
      role: Role.KITCHEN,
    },
  });

  const reception = await prisma.user.upsert({
    where: { email: "reception@mshindiServe.ke" },
    update: { passwordHash: staffHash },
    create: {
      name: "Salma Hassan",
      email: "reception@mshindiServe.ke",
      phone: "+254700000003",
      passwordHash: staffHash,
      role: Role.RECEPTION,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "grace@example.ke" },
    update: { passwordHash: userHash },
    create: {
      name: "Grace Njoroge",
      email: "grace@example.ke",
      phone: "+254712345678",
      passwordHash: userHash,
      role: Role.CUSTOMER,
    },
  });

  console.log("✅ Users seeded:", { admin: admin.id, kitchen: kitchen.id, customer: customer.id });

  // ── Menu Items ────────────────────────────────────────────────────────────
  const menuItems = [
    // GRILL
    { name: "Nyama Choma", description: "Slow-grilled marinated beef ribs, served with kachumbari and ugali", price: 120000, category: MenuCategory.GRILL, emoji: "🍖", isFeatured: true },
    { name: "Chicken Tikka", description: "Tandoori-marinated chicken breast, char-grilled to perfection", price: 88000, category: MenuCategory.GRILL, emoji: "🍗", isFeatured: true },
    { name: "Pork Ribs", description: "Half rack of BBQ pork ribs with house coleslaw", price: 145000, category: MenuCategory.GRILL, emoji: "🥩" },
    { name: "Mixed Grill Platter", description: "Beef, chicken, sausage & prawns for 2, with sauces", price: 220000, category: MenuCategory.GRILL, emoji: "🔥", isFeatured: true },
    // SEAFOOD
    { name: "Tilapia ya Pwani", description: "Whole Tilapia fried or grilled, coastal spices, served with rice", price: 95000, category: MenuCategory.SEAFOOD, emoji: "🐟", isFeatured: true },
    { name: "Pili Pili Prawns", description: "Spicy tiger prawns in garlic butter sauce, with coconut rice", price: 110000, category: MenuCategory.SEAFOOD, emoji: "🦐" },
    { name: "Calamari Rings", description: "Crispy fried squid rings, served with tartar sauce", price: 85000, category: MenuCategory.SEAFOOD, emoji: "🦑" },
    // SPECIALS
    { name: "Ugali & Sukuma Wiki", description: "Classic Kenyan combination — stone-ground ugali with braised kale", price: 35000, category: MenuCategory.SPECIALS, emoji: "🫙" },
    { name: "Vegetable Pilau", description: "Aromatic spiced basmati rice with seasonal vegetables", price: 42000, category: MenuCategory.SPECIALS, emoji: "🍛" },
    { name: "Githeri Special", description: "Slow-cooked maize and beans, Kenyan-spiced, with avocado", price: 38000, category: MenuCategory.SPECIALS, emoji: "🥘" },
    // STARTERS
    { name: "Samosa Platter (6pc)", description: "Crispy beef or vegetable samosas with mint chutney", price: 45000, category: MenuCategory.STARTERS, emoji: "🥟" },
    { name: "Grilled Maize", description: "Street-style roasted maize with lime and chili butter", price: 15000, category: MenuCategory.STARTERS, emoji: "🌽" },
    // DRINKS
    { name: "Tusker Lager", description: "Kenya's iconic cold lager — 500ml bottle", price: 35000, category: MenuCategory.DRINKS, emoji: "🍺", isFeatured: true },
    { name: "Dawa Cocktail", description: "Vodka, fresh lime, honey & muddled ginger over ice", price: 65000, category: MenuCategory.DRINKS, emoji: "🍹", isFeatured: true },
    { name: "Mango Passion Juice", description: "Fresh blended mango and passion fruit — no sugar added", price: 28000, category: MenuCategory.DRINKS, emoji: "🥭" },
    { name: "Dawa Water (500ml)", description: "Still or sparkling mineral water", price: 8000, category: MenuCategory.DRINKS, emoji: "💧" },
    // DESSERTS
    { name: "Mandazi & Chai", description: "Fried Swahili doughnuts with spiced Kenyan tea", price: 30000, category: MenuCategory.DESSERTS, emoji: "🍩" },
    { name: "Ice Cream Sundae", description: "3 scoops with chocolate sauce, nuts & whipped cream", price: 48000, category: MenuCategory.DESSERTS, emoji: "🍨" },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.name.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: item.name.replace(/\s+/g, "-").toLowerCase(), ...item },
    });
  }
  console.log(`✅ ${menuItems.length} menu items seeded`);

  // ── Rooms ─────────────────────────────────────────────────────────────────
  const rooms = [
    { name: "Standard Room", description: "Comfortable room with queen bed, ensuite bathroom, city view", pricePerNight: 450000, capacity: 2, amenities: ["WiFi", "Breakfast", "AC", "TV", "Hot Shower"], emoji: "🛏️" },
    { name: "Deluxe Garden View", description: "Spacious room overlooking the garden and pool deck", pricePerNight: 680000, capacity: 2, amenities: ["WiFi", "Breakfast", "AC", "Garden View", "Mini Bar", "TV"], emoji: "🌿" },
    { name: "Executive Suite", description: "Our premier suite with separate living area, jacuzzi & pool view", pricePerNight: 1250000, capacity: 3, amenities: ["WiFi", "Breakfast", "AC", "Jacuzzi", "Pool View", "Mini Bar", "Butler Service"], emoji: "👑" },
    { name: "Family Room", description: "Large room with 2 double beds, perfect for families", pricePerNight: 820000, capacity: 4, amenities: ["WiFi", "Breakfast", "AC", "2 Double Beds", "Kids Welcome", "TV"], emoji: "👨‍👩‍👧" },
    { name: "Budget Single", description: "Cosy single room, everything you need, nothing you don't", pricePerNight: 280000, capacity: 1, amenities: ["WiFi", "Breakfast", "Fan", "Shared Bathroom"], emoji: "🏠" },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.name.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: room.name.replace(/\s+/g, "-").toLowerCase(), ...room },
    });
  }
  console.log(`✅ ${rooms.length} rooms seeded`);

  // ── Events ────────────────────────────────────────────────────────────────
  const now = new Date();
  const events = [
    { title: "Jazz & Nyama Night", description: "Live jazz quartet + unlimited nyama choma. A Friday night staple at Fine Breeze.", date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), ticketPrice: 150000, totalSeats: 80, soldSeats: 47 },
    { title: "Trivia Friday", description: "Teams of 4, 6 rounds, prizes up to KES 5,000. Register your team at the door.", date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), ticketPrice: 50000, totalSeats: 120, soldSeats: 24 },
    { title: "Heritage Beer Festival", description: "15+ craft and imported beers on tap, live music, food pairings. A must for beer lovers.", date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), ticketPrice: 120000, totalSeats: 200, soldSeats: 134 },
    { title: "Stand-Up Comedy Night", description: "Three top Kenyan comedians, 3-course dinner included. Book early — always sells out.", date: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000), ticketPrice: 200000, totalSeats: 60, soldSeats: 18 },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.title.replace(/\s+/g, "-").toLowerCase() },
      update: {},
      create: { id: event.title.replace(/\s+/g, "-").toLowerCase(), ...event },
    });
  }
  console.log(`✅ ${events.length} events seeded`);

  // ── Sample Orders ─────────────────────────────────────────────────────────
  const nyamaChoma = await prisma.menuItem.findFirst({ where: { name: "Nyama Choma" } });
  const tusker = await prisma.menuItem.findFirst({ where: { name: "Tusker Lager" } });

  if (nyamaChoma && tusker) {
    await prisma.order.upsert({
      where: { orderNumber: "MS-0001" },
      update: {},
      create: {
        orderNumber: "MS-0001",
        userId: customer.id,
        status: "DELIVERED",
        totalAmount: 190000,
        tableNumber: "7",
        paymentStatus: "COMPLETED",
        mpesaRef: "QKV7X2ABC1",
        orderItems: {
          create: [
            { menuItemId: nyamaChoma.id, quantity: 1, unitPrice: nyamaChoma.price },
            { menuItemId: tusker.id, quantity: 2, unitPrice: tusker.price },
          ],
        },
      },
    });
    console.log("✅ Sample order seeded");
  }

  console.log("\n🎉 Seed complete! Login credentials:");
  console.log("   Admin:     admin@mshindiServe.ke / Admin@123!");
  console.log("   Kitchen:   kitchen@mshindiServe.ke / Staff@123!");
  console.log("   Reception: reception@mshindiServe.ke / Staff@123!");
  console.log("   Customer:  grace@example.ke / User@123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
