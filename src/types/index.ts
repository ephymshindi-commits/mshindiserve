// ─── Auth ─────────────────────────────────────────────────────────────────────

export type Role = "CUSTOMER" | "KITCHEN" | "RECEPTION" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string | Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface JWTPayload {
  sub: string;
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
  price: number;
  category: MenuCategory;
  imageUrl: string | null;
  emoji: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  notes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  user: User;
  status: OrderStatus;
  totalAmount: number;
  notes: string | null;
  tableNumber: string | null;
  isDelivery: boolean;
  deliveryAddr: string | null;
  paymentStatus: PaymentStatus;
  mpesaRef: string | null;
  orderItems: OrderItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  imageUrl: string | null;
  emoji: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  checkIn: string | Date;
  checkOut: string | Date;
  guests: number;
  totalAmount: number;
  status: BookingStatus;
  specialReqs: string | null;
  paymentStatus: PaymentStatus;
  mpesaRef: string | null;
  createdAt: string | Date;
}

// ─── Events & Tickets ─────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string | Date;
  venue: string;
  ticketPrice: number;
  totalSeats: number;
  soldSeats: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  createdAt: string | Date;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface MpesaStkRequest {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
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