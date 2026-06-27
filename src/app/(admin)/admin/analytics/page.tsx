import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getAnalytics() {
  const today = new Date();
  const weekStart = startOfDay(subDays(today, 6));

  try {
    const [payments, orders, bookings, tickets, users] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "COMPLETED", createdAt: { gte: weekStart } },
        select: { amount: true, createdAt: true },
      }),
      prisma.order.count(),
      prisma.booking.count(),
      prisma.ticket.count(),
      prisma.user.count(),
    ]);

    const revenueByDay = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(today, 6 - index);
      const key = format(date, "yyyy-MM-dd");
      const foodRevenue = payments
        .filter((payment) => format(new Date(payment.createdAt), "yyyy-MM-dd") === key)
        .reduce((sum, payment) => sum + payment.amount, 0);

      return { month: format(date, "EEE"), foodRevenue, roomRevenue: 0, ticketRevenue: 0 };
    });

    const todayRevenue = payments
      .filter((payment) => {
        const createdAt = new Date(payment.createdAt);
        return createdAt >= startOfDay(today) && createdAt <= endOfDay(today);
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      todayRevenue,
      weeklyRevenue: revenueByDay.reduce((sum, item) => sum + item.foodRevenue, 0),
      orders,
      bookings,
      tickets,
      users,
      revenueByDay,
    };
  } catch (error) {
    console.error("[Admin Analytics]", error);
    return {
      todayRevenue: 0,
      weeklyRevenue: 0,
      orders: 0,
      bookings: 0,
      tickets: 0,
      users: 0,
      revenueByDay: Array.from({ length: 7 }, (_, index) => ({
        month: format(subDays(today, 6 - index), "EEE"),
        foodRevenue: 0,
        roomRevenue: 0,
        ticketRevenue: 0,
      })),
    };
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div>
      <AdminSectionHeader
        title="Analytics"
        description="A concise operating snapshot for revenue and platform activity."
      />

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Today revenue", formatKES(data.todayRevenue)],
          ["Week revenue", formatKES(data.weeklyRevenue)],
          ["Orders", data.orders],
          ["Bookings", data.bookings],
          ["Tickets", data.tickets],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Revenue over the last 7 days
        </h2>
        <RevenueChart data={data.revenueByDay} />
      </div>
    </div>
  );
}
