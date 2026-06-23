"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly AI concierge for Fine Breeze Bar & Grill, a premium restaurant and hotel in Westlands, Nairobi, Kenya.

The business offers:
- FOOD & DRINKS: Nyama Choma (KES 1,200), Tilapia ya Pwani (KES 950), Chicken Tikka (KES 880), Ugali & Sukuma Wiki (KES 350), Tusker Lager (KES 350), Dawa Cocktail (KES 650), Mixed Grill Platter for 2 (KES 2,200), Pili Pili Prawns (KES 1,100), Vegetable Pilau (KES 420), Samosa Platter 6pc (KES 450)
- ROOMS: Standard (KES 4,500/night), Deluxe Garden View (KES 6,800/night), Executive Suite (KES 12,500/night), Family Room (KES 8,200/night), Budget Single (KES 2,800/night). All include breakfast and WiFi.
- EVENTS: Jazz & Nyama Night, Trivia Fridays, Beer Festival, Stand-Up Comedy Nights — check the Events page for current listings.
- PAYMENTS: M-Pesa accepted for all orders, bookings, and tickets.
- HOURS: Monday–Sunday, 11:00 AM – 2:00 AM. Kitchen closes at midnight.
- LOCATION: Westlands, Nairobi, near Sarit Centre. Ample parking available.
- CONTACT: +254 700 123 456

Be warm, concise, and helpful. Answer in 2-3 sentences max unless a list is needed. Use light Swahili phrases occasionally (asante, karibu, etc.) to add authenticity. If someone wants to order or book, encourage them to use the website's menu/rooms/events pages.`;

export function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Karibu! 👋 I'm your Fine Breeze concierge. Ask me about our menu, rooms, events, or anything else — I'm here to help!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const reply = data.content?.[0]?.text ?? "Sorry, I couldn't get a response. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Samahani! I'm having trouble connecting right now. Please call us at +254 700 123 456 or try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 left-4 z-50 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-sm">🤖</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">AI Concierge</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Online now
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 max-h-64 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-amber-600 text-white rounded-br-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <Loader2 size={14} className="animate-spin text-zinc-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about menu, rooms…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-zinc-950 hover:bg-zinc-800 border border-amber-600/50 text-amber-500 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
        aria-label="AI Concierge"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
