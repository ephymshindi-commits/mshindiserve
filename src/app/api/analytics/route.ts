import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import type { AuthenticatedRequest } from "@/lib/middleware";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export const GET = withAuth(
  async (_req: AuthenticatedRequest) => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // ── Run all queries in parallel ──────────────────────────────────────────
    const [
      todayRevenue,
      activeOrders,
      totalRooms,
      occupiedRooms,
      ticketsSoldToday,
      weeklyRevenueRaw,
      popularItemsRaw,
      totalUsers,
    ] = await Promise.all([
      // Today's revenue from completed payments
      prisma.payment.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),

      // Active orders (not delivered or cancelled)
      prisma.order.count({
        where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),

      // Total rooms
      prisma.room.count(),

      // Rooms currently occupied (checked in)
      prisma.booking.count({
        where: {
          status: "CHECKED_IN",
          checkIn: { lte: today },
          checkOut: { gte: today },
        },
      }),

      // Tickets sold today
      prisma.ticket.count({
        where: {
          paymentStatus: "COMPLETED",
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Revenue by day for last 7 days
      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: subDays(today, 6) },
        },
        _sum: { amount: true },
      }),

      // Most popular menu items (last 30 days)
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

      // Total registered users
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    // ── Build daily revenue array ─────────────────────────────────────────────
    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const match = weeklyRevenueRaw.find(
        (r) => format(new Date(r.createdAt), "yyyy-MM-dd") === dateStr
      );
      return {
        date: format(date, "EEE"),
        amount: Math.round((match?._sum.amount ?? 0) / 100), // cents → KES
      };
    });

    // ── Hydrate popular items with names ──────────────────────────────────────
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

    const weeklyRevenue = revenueByDay.reduce((s, d) => s + d.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        todayRevenue: Math.round((todayRevenue._sum.amount ?? 0) / 100),
        activeOrders,
        roomOccupancy:
          totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
        ticketsSoldToday,
        weeklyRevenue,
        totalUsers,
        revenueByDay,
        popularItems,
      },
    });
  },
  ["ADMIN"]
);
