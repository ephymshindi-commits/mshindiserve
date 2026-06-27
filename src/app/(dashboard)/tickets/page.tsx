"use client";

import { Download, Loader2, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { AuthModal } from "@/components/shared/AuthModal";
import { ticketsApi } from "@/lib/api";
import { capitalize, formatDate, formatKES, paymentStatusColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface TicketRecord {
  id: string;
  ticketCode: string;
  eventId: string;
  quantity: number;
  totalAmount: number;
  status: "ACTIVE" | "USED" | "CANCELLED" | string;
  paymentStatus: string;
  createdAt: string;
  event: { title: string; date: string; venue: string };
}

function buildQrPayload(ticket: TicketRecord) {
  return JSON.stringify({
    code: ticket.ticketCode,
    eventId: ticket.eventId,
    qty: ticket.quantity,
    v: 1,
  });
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    USED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  };

  return map[status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function triggerPngDownload(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadTicketImage(ticket: TicketRecord) {
  const qrSvg = document.getElementById(`ticket-qr-${ticket.id}`);

  if (!(qrSvg instanceof SVGSVGElement)) {
    toast.error("Ticket QR code is not ready yet.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 300;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    toast.error("Your browser could not create the ticket image.");
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(0, 0, 10, canvas.height);

  ctx.fillStyle = "#18181b";
  ctx.font = "700 24px Arial";
  const nextY = drawWrappedText(ctx, ticket.event.title, 34, 50, 340, 28, 2);

  ctx.font = "500 15px Arial";
  ctx.fillStyle = "#52525b";
  ctx.fillText(formatDate(ticket.event.date), 34, nextY + 12);
  drawWrappedText(ctx, ticket.event.venue, 34, nextY + 38, 340, 20, 2);

  ctx.font = "700 14px monospace";
  ctx.fillStyle = "#92400e";
  ctx.fillText(ticket.ticketCode, 34, 190);

  ctx.font = "500 14px Arial";
  ctx.fillStyle = "#3f3f46";
  ctx.fillText(`Quantity: ${ticket.quantity}`, 34, 218);
  ctx.fillText(`Amount: ${formatKES(ticket.totalAmount)}`, 34, 242);

  ctx.font = "600 11px Arial";
  ctx.fillStyle = "#71717a";
  ctx.fillText("Fine Breeze Bar & Grill | Powered by MshindiServe", 34, 278);

  const serialized = new XMLSerializer().serializeToString(qrSvg);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render QR code."));
      image.src = svgUrl;
    });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not render QR code.");
    URL.revokeObjectURL(svgUrl);
    return;
  }

  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(410, 54, 150, 150);
  ctx.drawImage(image, 425, 69, 120, 120);
  ctx.font = "600 12px Arial";
  ctx.fillStyle = "#52525b";
  ctx.textAlign = "center";
  ctx.fillText("Scan at entry", 485, 228);
  ctx.textAlign = "left";

  URL.revokeObjectURL(svgUrl);
  triggerPngDownload(canvas, `ticket-${ticket.ticketCode}.png`);
  toast.success("Ticket downloaded.");
}

export default function TicketsPage() {
  const { isAuthenticated } = useAuthStore();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    ticketsApi
      .getAll()
      .then((res) => setTickets(res.data.data ?? []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  async function handleDownload(ticket: TicketRecord) {
    setDownloadingId(ticket.id);
    try {
      await downloadTicketImage(ticket);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AccountPage
      title="My tickets"
      description="View event tickets reserved through MshindiServe."
      icon={<Ticket size={22} />}
      isAuthenticated={isAuthenticated}
      loading={loading}
      onSignIn={() => setAuthOpen(true)}
    >
      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" text="Buy an event ticket and your code will appear here." />
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {ticket.ticketCode}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(ticket.status)}`}>
                      {capitalize(ticket.status)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusColor(ticket.paymentStatus)}`}>
                      {capitalize(ticket.paymentStatus)}
                    </span>
                  </div>

                  <p className="mt-3 text-base font-semibold text-zinc-950 dark:text-white">
                    {ticket.event.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatDate(ticket.event.date)} - {ticket.event.venue}
                  </p>

                  <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                      <p className="text-xs text-zinc-500">Quantity</p>
                      <p className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {ticket.quantity} ticket{ticket.quantity === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950/60">
                      <p className="text-xs text-zinc-500">Amount</p>
                      <p className="mt-1 font-semibold text-zinc-950 dark:text-white">
                        {formatKES(ticket.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(ticket)}
                    disabled={downloadingId === ticket.id}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    {downloadingId === ticket.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {downloadingId === ticket.id ? "Preparing ticket" : "Download ticket"}
                  </button>
                </div>

                <div className="flex w-full shrink-0 flex-col items-center rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:w-40 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <QRCodeSVG
                    id={`ticket-qr-${ticket.id}`}
                    value={buildQrPayload(ticket)}
                    size={120}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#18181b"
                    marginSize={2}
                  />
                  <p className="mt-3 text-center text-xs font-medium text-zinc-500">Scan at entry</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </AccountPage>
  );
}

function AccountPage({
  title,
  description,
  icon,
  isAuthenticated,
  loading,
  onSignIn,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  isAuthenticated: boolean;
  loading: boolean;
  onSignIn: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 pb-16 dark:bg-zinc-950">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 size={20} className="animate-spin text-amber-600" />
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-950 dark:text-white">Sign in required</p>
            <p className="mt-1 text-sm text-zinc-500">Use your guest account to view this history.</p>
            <button
              onClick={onSignIn}
              className="mt-5 h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Sign in
            </button>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-950 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{text}</p>
    </div>
  );
}
