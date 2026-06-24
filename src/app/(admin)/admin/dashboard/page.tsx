import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/utils";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const dynamic = "force-dynamic"; // ✅ CRITICAL FIX (stops build crash)

async function getDashboardStats() {
  const today = new Date();

  try {
    const [
      todayRevenue,
      activeOrders,
      totalRooms,
      occupiedRooms,
      ticketsSoldToday,
      weeklyRevenueRaw,
      popularItemsRaw,
      recentOrders,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
        _sum: { amount: true },
      }),

      prisma.order.count({
        where: {
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        },
      }),

      prisma.room.count(),

      prisma.booking.count({
        where: {
          status: "CHECKED_IN",
          checkIn: { lte: today },
          checkOut: { gte: today },
        },
      }),

      prisma.ticket.count({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),

      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: subDays(today, 6) },
        },
        _sum: { amount: true },
      }),

      prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            createdAt: { gte: subDays(today, 30) },
            status: { notIn: ["CANCELLED"] },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),

      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          orderItems: {
            take: 2,
            include: {
              menuItem: {
                select: { name: true, emoji: true },
              },
            },
          },
        },
      }),
    ]);

    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, "yyyy-MM-dd");

      const match = weeklyRevenueRaw.find(
        (r) => format(new Date(r.createdAt), "yyyy-MM-dd") === dateStr
      );

      return {
        date: format(date, "EEE"),
        amount: Math.round((match?._sum.amount ?? 0) / 100),
      };
    });

    const menuItemIds = popularItemsRaw.map((p) => p.menuItemId);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, emoji: true },
    });

    const menuMap = new Map(menuItems.map((m) => [m.id, m]));

    const popularItems = popularItemsRaw.map((p) => ({
      name: menuMap.get(p.menuItemId)?.name ?? "Unknown",
      emoji: menuMap.get(p.menuItemId)?.emoji ?? "🍽️",
      count: p._sum.quantity ?? 0,
    }));

    return {
      todayRevenue: Math.round((todayRevenue._sum.amount ?? 0) / 100),
      activeOrders,
      roomOccupancy:
        totalRooms > 0
          ? Math.round((occupiedRooms / totalRooms) * 100)
          : 0,
      ticketsSoldToday,
      revenueByDay,
      popularItems,
      recentOrders,
    };
  } catch (error) {
    console.error("Dashboard DB Error:", error);

    // ✅ fallback (prevents crash)
    return {
      todayRevenue: 0,
      activeOrders: 0,
      roomOccupancy: 0,
      ticketsSoldToday: 0,
      revenueByDay: [],
      popularItems: [],
      recentOrders: [],
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const metrics = [
    {
      label: "Today's revenue",
      value: `KES ${stats.todayRevenue.toLocaleString()}`,
      change: "↑ Live",
      positive: true,
    },
    {
      label: "Active orders",
      value: String(stats.activeOrders),
      change: "Needs attention",
      positive: stats.activeOrders > 0,
    },
    {
      label: "Room occupancy",
      value: `${stats.roomOccupancy}%`,
      change:
        stats.roomOccupancy >= 80 ? "↑ High" : "Room available",
      positive: stats.roomOccupancy >= 60,
    },
    {
      label: "Tickets today",
      value: String(stats.ticketsSoldToday),
      change: "↑ Events active",
      positive: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")} · Live data
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4"
          >
            <p className="text-xs text-zinc-500 mb-2">{m.label}</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {m.value}
            </p>
            <p
              className={`text-xs mt-1 ${
                m.positive ? "text-green-600" : "text-zinc-400"
              }`}
            >
              {m.change}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          Revenue — last 7 days
        </h2>
        <RevenueChart data={stats.revenueByDay} />
      </div>

      {/* Popular items + Orders */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Top items — last 30 days
          </h2>

          <div className="space-y-3">
            {stats.popularItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>

                <div className="flex-1">
                  <p className="text-sm text-zinc-900 dark:text-white">
                    {item.name}
                  </p>

                  <div className="mt-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (item.count /
                            (stats.popularItems[0]?.count || 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <span className="text-xs text-zinc-500 font-medium">
                  {item.count} orders
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Recent orders
            </h2>
          </div>

          <AdminOrdersTable
            orders={stats.recentOrders as any}
            compact
          />
        </div>
      </div>
    </div>
  );
}