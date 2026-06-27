"use client";

import { CalendarPlus, Download, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatKES } from "@/lib/utils";

type DashboardReport = {
  generatedAt: string;
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
};

type DashboardQuickActionsProps = {
  report: DashboardReport;
};

const quickLinks = [
  {
    href: "/admin/menu?new=menu",
    label: "Add menu item",
    description: "Create a dish or drink",
    icon: Plus,
  },
  {
    href: "/admin/events?new=event",
    label: "Add event",
    description: "Publish a ticketed event",
    icon: CalendarPlus,
  },
  {
    href: "/admin/orders",
    label: "View pending orders",
    description: "Open the live order queue",
    icon: ShoppingBag,
  },
];

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function DashboardQuickActions({ report }: DashboardQuickActionsProps) {
  function downloadReport() {
    const rows = [
      ["Metric", "Value"],
      ["Generated At", new Date(report.generatedAt).toLocaleString("en-KE")],
      ["Revenue 30d", formatKES(report.totalRevenue30d)],
      ["Revenue Change", `${report.revenueChange}%`],
      ["Orders Today", report.ordersToday],
      ["Pending Orders", report.pendingOrders],
      ["Rooms Occupied", `${report.roomsOccupied}/${report.totalRooms}`],
      ["Occupancy Rate", `${report.occupancyRate}%`],
      ["Tickets Sold This Month", report.ticketsSoldThisMonth],
      ["Ticket Revenue This Month", formatKES(report.ticketRevenueThisMonth)],
      ["New Customers 30d", report.newCustomers30d],
      ["Total Customers", report.totalCustomers],
      ["Average Order Value", formatKES(report.avgOrderValue)],
      ["Top Selling Item", report.topSellingItem],
      ["Top Selling Count", report.topSellingCount],
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mshindiserve-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Quick actions</h2>
        <p className="text-sm text-zinc-500">Fast paths for daily admin work</p>
      </div>

      <div className="grid gap-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition hover:border-amber-300 hover:bg-amber-50/70 dark:border-zinc-800 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition group-hover:bg-amber-100 group-hover:text-amber-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-amber-950 dark:group-hover:text-amber-300">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-950 dark:text-white">{item.label}</span>
                <span className="block text-xs text-zinc-500">{item.description}</span>
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={downloadReport}
          className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-3 text-left transition hover:border-green-300 hover:bg-green-50/70 dark:border-zinc-800 dark:hover:border-green-700 dark:hover:bg-green-950/20"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition group-hover:bg-green-100 group-hover:text-green-700 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-green-950 dark:group-hover:text-green-300">
            <Download size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-zinc-950 dark:text-white">Download report</span>
            <span className="block text-xs text-zinc-500">Export this month&apos;s snapshot</span>
          </span>
        </button>
      </div>
    </div>
  );
}
