import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware";

const limiter = rateLimit(60_000, 20);

const SYSTEM_PROMPT = `You are a friendly AI concierge for Fine Breeze Bar & Grill, a premium restaurant and hotel in Westlands, Nairobi, Kenya.

The business offers:
- FOOD & DRINKS: Nyama Choma (KES 1,200), Tilapia ya Pwani (KES 950), Chicken Tikka (KES 880), Ugali & Sukuma Wiki (KES 350), Tusker Lager (KES 350), Dawa Cocktail (KES 650), Mixed Grill Platter for 2 (KES 2,200), Pili Pili Prawns (KES 1,100), Vegetable Pilau (KES 420), Samosa Platter 6pc (KES 450)
- ROOMS: Standard (KES 4,500/night), Deluxe Garden View (KES 6,800/night), Executive Suite (KES 12,500/night), Family Room (KES 8,200/night), Budget Single (KES 2,800/night). All rooms include breakfast and WiFi.
- PAYMENTS: M-Pesa accepted for everything.
- HOURS: Monday–Sunday, 11:00 AM – 2:00 AM. Kitchen closes at midnight.
- LOCATION: Westlands, Nairobi, near Sarit Centre. Ample parking.
- CONTACT: +254 700 123 456

Rules:
- Be warm, concise, and helpful. Max 2-3 sentences unless listing items.
- Occasionally use light Swahili (asante, karibu, sawa) for authenticity.
- If someone wants to order/book, direct them to the relevant page on the site.
- Never make up prices or information not listed above.`;

export async function POST(req: NextRequest) {
  const limited = limiter(req);
  if (limited) return limited;

  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  // Keep last 10 messages to stay within context limits
  const messages = body.messages.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.content).slice(0, 1000), // cap input length
  }));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      console.error("[Concierge] Anthropic error:", res.status);
      return NextResponse.json(
        { content: [{ text: "Samahani! I'm having a moment. Try again shortly or call +254 700 123 456." }] },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Concierge] Error:", err);
    return NextResponse.json(
      { content: [{ text: "Samahani! Connection issue. Please try again." }] },
      { status: 200 }
    );
  }
}
