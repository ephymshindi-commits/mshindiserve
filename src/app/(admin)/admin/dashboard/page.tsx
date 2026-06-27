import { format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";
import { RevenueChart, type RevenueChartRow } from "@/components/admin/RevenueChart";
import { getDemoAnalytics, getDemoStats, type DemoActivity } from "@/lib/fallback-data";
import { prisma } from "@/lib/prisma";
import { formatKES, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ActivityType = DemoActivity["type"];

type DashboardActivity = {
  text: string;
  time: string;
  type: ActivityType;
};

type DashboardStats = {
  isDemo: boolean;
  totalRevenue30d: number;
  revenueChange: number;
  ordersToday: number;
  pendingOrders: number;
  roomsOccupied: number;
  totalRooms: number;
  occupancyRate: number;
  ticketsSoldThisMonth: number;
  ticketRevenueThisMonth: number;
  newCustomers30d: number;
  totalCustomers: number;
  avgOrderValue: number;
  topSellingItem: string;
  topSellingCount: number;
  revenueByMonth: RevenueChartRow[];
  recentActivity: DashboardActivity[];
  reportGeneratedAt: string;
};

const activityDotClasses: Record<ActivityType, string> = {
  order: "bg-amber-500 ring-amber-100",
  booking: "bg-blue-500 ring-blue-100",
  ticket: "bg-purple-500 ring-purple-100",
  admin: "bg-zinc-500 ring-zinc-100",
  payment: "bg-green-500 ring-green-100",
  kitchen: "bg-orange-500 ring-orange-100",
  user: "bg-teal-500 ring-teal-100",
};

function asCents(value: number | null | undefined) {
  return value ?? 0;
}

function decimalKesToCents(value: unknown) {
  return Math.round(Number(value ?? 0) * 100);
}

function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function buildDemoDashboard(): DashboardStats {
  const demoStats = getDemoStats();

  return {
    isDemo: true,
    totalRevenue30d: demoStats.totalRevenue30d,
    revenueChange: demoStats.revenueChange,
    ordersToday: demoStats.ordersToday,
    pendingOrders: demoStats.pendingOrders,
    roomsOccupied: demoStats.roomsOccupied,
    totalRooms: demoStats.totalRooms,
    occupancyRate: demoStats.occupancyRate,
    ticketsSoldThisMonth: demoStats.ticketsSoldThisMonth,
    ticketRevenueThisMonth: demoStats.ticketRevenue30d,
    newCustomers30d: demoStats.newCustomers30d,
    totalCustomers: demoStats.totalCustomers,
    avgOrderValue: demoStats.avgOrderValue,
    topSellingItem: demoStats.topSellingItem,
    topSellingCount: demoStats.topSellingCount,
    revenueByMonth: getDemoAnalytics().map(({ month, foodRevenue, roomRevenue, ticketRevenue }) => ({
      month,
      foodRevenue,
      roomRevenue,
      ticketRevenue,
    })),
    recentActivity: demoStats.recentActivity,
    reportGeneratedAt: new Date().toISOString(),
  };
}

function inferActivityType(action: string, resource: string): ActivityType {
  const value = `${action} ${resource}`.toLowerCase();

  if (value.includes("booking") || value.includes("room")) return "booking";
  if (value.includes("ticket") || value.includes("event")) return "ticket";
  if (value.includes("payment") || value.includes("mpesa")) return "payment";
  if (value.includes("kitchen") || value.includes("ready") || value.includes("preparing")) return "kitchen";
  if (value.includes("user") || value.includes("customer") || value.includes("register")) return "user";
  if (value.includes("order")) return "order";
  return "admin";
}

function formatActivityText(log: {
  action: string;
  resource: string;
  resourceId: string | null;
  user?: { name: string | null } | null;
}) {
  const actor = log.user?.name ?? "System";
  const action = log.action.replace(/_/g, " ").toLowerCase();
  const resource = log.resource.replace(/_/g, " ").toLowerCase();
  const suffix = log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : "";

  return `${actor} ${action} ${resource}${suffix}`;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const start30d = subDays(now, 30);
  const previous30dStart = subDays(start30d, 30);
  const monthStart = startOfMonth(now);
  const twelveMonthStart = startOfMonth(subMonths(now, 11));

  try {
    const [
      orderRevenue30d,
      orderRevenuePrevious30d,
      bookingRevenue30d,
      bookingRevenuePrevious30d,
      ticketRevenue30d,
      ticketRevenuePrevious30d,
      liquorSales30d,
      liquorSalesPrevious30d,
      ordersToday,
      pendingOrders,
      roomsTotal,
      roomsOccupied,
      ticketsThisMonth,
      customersTotal,
      newCustomers30d,
      topItems,
      monthlyOrders,
      monthlyBookings,
      monthlyTickets,
      monthlyLiquorSales,
      activityLogs,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: start30d },
        },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: previous30dStart, lt: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: previous30dStart, lt: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.ticket.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.ticket.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: previous30dStart, lt: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.liquorTransaction.aggregate({
        where: {
          type: "SALE",
          timestamp: { gte: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.liquorTransaction.aggregate({
        where: {
          type: "SALE",
          timestamp: { gte: previous30dStart, lt: start30d },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.room.count(),
      prisma.booking.count({
        where: {
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lte: now },
          checkOut: { gt: now },
        },
      }),
      prisma.ticket.aggregate({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: monthStart },
        },
        _sum: { quantity: true, totalAmount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: { gte: start30d },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            createdAt: { gte: start30d },
            status: { not: "CANCELLED" },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 1,
      }),
      prisma.order.findMany({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: twelveMonthStart },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: twelveMonthStart },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.ticket.findMany({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: twelveMonthStart },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.liquorTransaction.findMany({
        where: {
          type: "SALE",
          timestamp: { gte: twelveMonthStart },
        },
        select: { totalAmount: true, timestamp: true },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),
    ]);

    const topItem = topItems[0];
    const topMenuItem = topItem
      ? await prisma.menuItem.findUnique({
          where: { id: topItem.menuItemId },
          select: { name: true },
        })
      : null;

    const foodRevenue30d =
      asCents(orderRevenue30d._sum.totalAmount) + decimalKesToCents(liquorSales30d._sum.totalAmount);
    const roomRevenue30d = asCents(bookingRevenue30d._sum.totalAmount);
    const ticketRevenueTotal30d = asCents(ticketRevenue30d._sum.totalAmount);
    const totalRevenue30d = foodRevenue30d + roomRevenue30d + ticketRevenueTotal30d;

    const previousRevenue30d =
      asCents(orderRevenuePrevious30d._sum.totalAmount) +
      asCents(bookingRevenuePrevious30d._sum.totalAmount) +
      asCents(ticketRevenuePrevious30d._sum.totalAmount) +
      decimalKesToCents(liquorSalesPrevious30d._sum.totalAmount);

    const monthlyRevenueMap = new Map<string, RevenueChartRow>(
      Array.from({ length: 12 }, (_, index) => {
        const date = startOfMonth(subMonths(now, 11 - index));
        return [
          monthKey(date),
          {
            month: format(date, "MMM"),
            foodRevenue: 0,
            roomRevenue: 0,
            ticketRevenue: 0,
          },
        ];
      })
    );

    for (const order of monthlyOrders) {
      monthlyRevenueMap.get(monthKey(order.createdAt))!.foodRevenue += order.totalAmount;
    }

    for (const sale of monthlyLiquorSales) {
      monthlyRevenueMap.get(monthKey(sale.timestamp))!.foodRevenue += decimalKesToCents(sale.totalAmount);
    }

    for (const booking of monthlyBookings) {
      monthlyRevenueMap.get(monthKey(booking.createdAt))!.roomRevenue += booking.totalAmount;
    }

    for (const ticket of monthlyTickets) {
      monthlyRevenueMap.get(monthKey(ticket.createdAt))!.ticketRevenue += ticket.totalAmount;
    }

    const revenueByMonth = Array.from(monthlyRevenueMap.values());
    const hasBusinessData =
      totalRevenue30d > 0 ||
      roomsTotal > 0 ||
      ordersToday > 0 ||
      (ticketsThisMonth._sum.quantity ?? 0) > 0 ||
      (topItem?._sum.quantity ?? 0) > 0;

    if (!hasBusinessData) {
      return buildDemoDashboard();
    }

    const demoActivity = getDemoStats().recentActivity;
    const recentActivity =
      activityLogs.length > 0
        ? activityLogs.map((log) => ({
            text: formatActivityText(log),
            time: timeAgo(log.createdAt),
            type: inferActivityType(log.action, log.resource),
          }))
        : demoActivity;

    return {
      isDemo: false,
      totalRevenue30d,
      revenueChange: percentChange(totalRevenue30d, previousRevenue30d),
      ordersToday,
      pendingOrders,
      roomsOccupied,
      totalRooms: roomsTotal,
      occupancyRate: roomsTotal > 0 ? Math.round((roomsOccupied / roomsTotal) * 100) : 0,
      ticketsSoldThisMonth: ticketsThisMonth._sum.quantity ?? 0,
      ticketRevenueThisMonth: asCents(ticketsThisMonth._sum.totalAmount),
      newCustomers30d,
      totalCustomers: customersTotal,
      avgOrderValue: Math.round(orderRevenue30d._avg.totalAmount ?? 0),
      topSellingItem: topMenuItem?.name ?? "No sales yet",
      topSellingCount: topItem?._sum.quantity ?? 0,
      revenueByMonth,
      recentActivity,
      reportGeneratedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("[Admin Dashboard]", error);
    return buildDemoDashboard();
  }
}

function ChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        isPositive
          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {isPositive ? "+" : ""}
      {value}% 30d
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  badge,
  children,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
        </div>
        {badge}
      </div>
      {subtitle ? <p className="mt-2 text-sm text-zinc-500">{subtitle}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-950 dark:text-white">Dashboard</h1>
            {stats.isDemo ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                Demo data
              </span>
            ) : null}
          </div>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue (30d)"
          value={formatKES(stats.totalRevenue30d)}
          subtitle="Food, bar, rooms, and tickets"
          badge={<ChangeBadge value={stats.revenueChange} />}
        />
        <MetricCard
          title="Orders Today"
          value={stats.ordersToday}
          subtitle={`${stats.pendingOrders} pending in the kitchen queue`}
          badge={
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Live
            </span>
          }
        />
        <MetricCard
          title="Room Occupancy"
          value={`${stats.roomsOccupied}/${stats.totalRooms || 0} rooms`}
          subtitle={`${stats.occupancyRate}% occupancy rate`}
        >
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.min(100, stats.occupancyRate)}%` }}
            />
          </div>
        </MetricCard>
        <MetricCard
          title="Tickets This Month"
          value={stats.ticketsSoldThisMonth}
          subtitle={`${formatKES(stats.ticketRevenueThisMonth)} ticket revenue`}
          badge={
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              Events
            </span>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="New Customers (30d)"
          value={stats.newCustomers30d}
          subtitle={`of ${stats.totalCustomers.toLocaleString()} total customers`}
        />
        <MetricCard title="Avg Order Value" value={formatKES(stats.avgOrderValue)} subtitle="Completed food and bar orders" />
        <MetricCard
          title="Top Selling Item"
          value={stats.topSellingItem}
          subtitle={`sold ${stats.topSellingCount.toLocaleString()} times`}
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Revenue by department</h2>
            <p className="text-sm text-zinc-500">Monthly food, room, and ticket revenue</p>
          </div>
          <span className="text-xs font-medium text-zinc-500">Last 12 months</span>
        </div>
        <RevenueChart data={stats.revenueByMonth} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <DashboardQuickActions
          report={{
            generatedAt: stats.reportGeneratedAt,
            totalRevenue30d: stats.totalRevenue30d,
            revenueChange: stats.revenueChange,
            ordersToday: stats.ordersToday,
            pendingOrders: stats.pendingOrders,
            roomsOccupied: stats.roomsOccupied,
            totalRooms: stats.totalRooms,
            occupancyRate: stats.occupancyRate,
            ticketsSoldThisMonth: stats.ticketsSoldThisMonth,
            ticketRevenueThisMonth: stats.ticketRevenueThisMonth,
            newCustomers30d: stats.newCustomers30d,
            totalCustomers: stats.totalCustomers,
            avgOrderValue: stats.avgOrderValue,
            topSellingItem: stats.topSellingItem,
            topSellingCount: stats.topSellingCount,
          }}
        />

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Recent activity</h2>
            <p className="text-sm text-zinc-500">Latest admin, sales, and operations updates</p>
          </div>
          <div className="space-y-4">
            {stats.recentActivity.map((activity, index) => (
              <div key={`${activity.text}-${index}`} className="flex gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${activityDotClasses[activity.type]}`}
                />
                <div className="min-w-0 flex-1 border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{activity.text}</p>
                  <p className="mt-1 text-xs text-zinc-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
