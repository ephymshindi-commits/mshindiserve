// ─── Auth ─────────────────────────────────────────────────────────────────────

export type Role = "CUSTOMER" | "KITCHEN" | "RECEPTION" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JWTPayload {
  sub: string; // userId
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export type MenuCategory =
  | "GRILL"
  | "DRINKS"
  | "SPECIALS"
  | "SEAFOOD"
  | "STARTERS"
  | "DESSERTS";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  category: MenuCategory;
  imageUrl?: string;
  emoji: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  user: User;
  status: OrderStatus;
  totalAmount: number;
  notes?: string;
  tableNumber?: string;
  isDelivery: boolean;
  deliveryAddr?: string;
  paymentStatus: PaymentStatus;
  mpesaRef?: string;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  imageUrl?: string;
  emoji: string;
  isAvailable: boolean;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";

export interface Booking {
  id: string;
  bookingNumber: string;
  user: User;
  room: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  status: BookingStatus;
  specialReqs?: string;
  paymentStatus: PaymentStatus;
  mpesaRef?: string;
  createdAt: string;
}

// ─── Events & Tickets ─────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  ticketPrice: number;
  totalSeats: number;
  soldSeats: number;
  imageUrl?: string;
  isActive: boolean;
}

export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED";

export interface Ticket {
  id: string;
  ticketCode: string;
  user: User;
  event: Event;
  quantity: number;
  totalAmount: number;
  status: TicketStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface MpesaStkRequest {
  phoneNumber: string;
  amount: number; // in KES (full)
  reference: string; // e.g. order number
  description: string;
  // One of these must be provided:
  orderId?: string;
  bookingId?: string;
  ticketId?: string;
}

export interface MpesaStkResponse {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  message: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  activeOrders: number;
  roomOccupancy: number;
  ticketsSoldToday: number;
  weeklyRevenue: number;
  totalUsers: number;
  revenueByDay: { date: string; amount: number }[];
  popularItems: { name: string; count: number; emoji: string }[];
}
