import { format, format as formatDateFns, startOfDay, subDays } from "date-fns";
import Link from "next/link";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const today = new Date();

  try {
    const [
      payments,
      activeOrders,
      totalRooms,
      occupiedRooms,
      ticketsSoldToday,
      recentOrders,
      popularItemsRaw,
      totalUsers,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "COMPLETED", createdAt: { gte: startOfDay(subDays(today, 6)) } },
        select: { amount: true, createdAt: true },
      }),
      prisma.order.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
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
          createdAt: { gte: startOfDay(today) },
        },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          orderItems: {
            take: 3,
            include: { menuItem: { select: { name: true } } },
          },
        },
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
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(today, 6 - index);
      const key = formatDateFns(date, "yyyy-MM-dd");
      const amount = payments
        .filter((payment) => formatDateFns(new Date(payment.createdAt), "yyyy-MM-dd") === key)
        .reduce((sum, payment) => sum + payment.amount, 0);

      return { date: formatDateFns(date, "EEE"), amount: Math.round(amount / 100) };
    });

    const todayKey = formatDateFns(today, "yyyy-MM-dd");
    const todayRevenue = payments
      .filter((payment) => formatDateFns(new Date(payment.createdAt), "yyyy-MM-dd") === todayKey)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: popularItemsRaw.map((item) => item.menuItemId) } },
      select: { id: true, name: true },
    });
    const menuMap = new Map(menuItems.map((item) => [item.id, item.name]));

    return {
      todayRevenue: Math.round(todayRevenue / 100),
      activeOrders,
      roomOccupancy: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      ticketsSoldToday,
      totalUsers,
      revenueByDay,
      popularItems: popularItemsRaw.map((item) => ({
        name: menuMap.get(item.menuItemId) ?? "Unknown item",
        count: item._sum.quantity ?? 0,
      })),
      recentOrders,
    };
  } catch (error) {
    console.error("[Admin Dashboard]", error);
    return {
      todayRevenue: 0,
      activeOrders: 0,
      roomOccupancy: 0,
      ticketsSoldToday: 0,
      totalUsers: 0,
      revenueByDay: Array.from({ length: 7 }, (_, index) => ({
        date: formatDateFns(subDays(today, 6 - index), "EEE"),
        amount: 0,
      })),
      popularItems: [],
      recentOrders: [],
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {format(new Date(), "EEEE, d MMMM yyyy")} - live operating snapshot
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          View site
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Today revenue", `KES ${stats.todayRevenue.toLocaleString()}`],
          ["Active orders", stats.activeOrders],
          ["Room occupancy", `${stats.roomOccupancy}%`],
          ["Tickets today", stats.ticketsSoldToday],
          ["Customers", stats.totalUsers],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Revenue over the last 7 days
        </h2>
        <RevenueChart data={stats.revenueByDay} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Popular items, last 30 days
          </h2>
          {stats.popularItems.length === 0 ? (
            <p className="text-sm text-zinc-500">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.popularItems.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-950 dark:text-white">{item.name}</span>
                    <span className="text-zinc-500">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-amber-600"
                      style={{
                        width: `${Math.min(100, (item.count / (stats.popularItems[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Recent orders</h2>
          </div>
          <AdminOrdersTable orders={JSON.parse(JSON.stringify(stats.recentOrders))} compact />
        </div>
      </div>
    </div>
  );
}
