import { demoMenuItems, demoRooms, getDemoEvents } from "@/lib/fallback-data";
import type { Event, MenuItem, Room } from "@/types";

const menuById = new Map(demoMenuItems.map((item) => [item.id, item.imageUrl]));
const roomById = new Map(demoRooms.map((room) => [room.id, room.imageUrl]));
const eventById = new Map(getDemoEvents().map((event) => [event.id, event.imageUrl]));

const categoryImages: Record<string, string> = {
  GRILL:
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
  SEAFOOD:
    "https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=900&q=80",
  DRINKS:
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80",
  STARTERS:
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  SPECIALS:
    "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80",
  DESSERTS:
    "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=900&q=80",
};

export function menuImage(item: Pick<MenuItem, "id" | "imageUrl" | "category">) {
  return item.imageUrl ?? menuById.get(item.id) ?? categoryImages[item.category];
}

export function roomImage(room: Pick<Room, "id" | "imageUrl">) {
  return (
    room.imageUrl ??
    roomById.get(room.id) ??
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
  );
}

export function eventImage(event: Pick<Event, "id" | "imageUrl">) {
  return (
    event.imageUrl ??
    eventById.get(event.id) ??
    "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80"
  );
}

export function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
