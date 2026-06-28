# MshindiServe Client Manual

Prepared for client handover and business demonstration.

## 1. Platform Overview

MshindiServe is a hospitality management platform for a hotel, restaurant, bar, and events business. It gives customers a polished public website while giving management one unified admin panel for daily operations.

The system currently supports:

- Restaurant menu browsing and food ordering
- Room listings and booking management
- Event listings and ticket purchases
- Liquor and bar inventory management
- Gallery photos for customer trust and marketing
- Kitchen and reception staff workspaces
- Admin dashboard, users, stock, sales, bookings, orders, and tickets

## 2. Main Website Pages

- Home: `/`
- Menu and ordering: `/menu`
- Rooms and booking: `/rooms`
- Events and tickets: `/events`
- Bar and liquor list: `/bar`
- Gallery: `/gallery`
- Customer login: `/login`
- Customer registration: `/register`

## 3. Admin And Staff Access

Admin panel:

- Admin dashboard: `/admin/dashboard`
- Admin orders: `/admin/orders`
- Menu management: `/admin/menu`
- Liquor management: `/admin/liquor`
- Gallery management: `/admin/gallery`
- Room management: `/admin/rooms`
- Event management: `/admin/events`
- User and staff management: `/admin/users`
- Analytics: `/admin/analytics`

Staff panels:

- Kitchen staff: `/staff/kitchen`
- Reception staff: `/staff/reception`

Staff and admin accounts should be created by the administrator from the admin users page. Public registration is for customers only.

## 4. User Roles

Customer:

- Can register and sign in from the public website
- Can place food orders
- Can book rooms
- Can buy event tickets

Kitchen:

- Can sign in to the kitchen panel
- Can view active food orders
- Can move orders through preparation stages

Reception:

- Can sign in to the reception panel
- Can view room bookings
- Can update booking progress

Admin:

- Has access to the full admin panel
- Can manage menu items, rooms, events, liquor stock, gallery photos, users, and business analytics

## 5. Daily Operations Guide

### Managing Food Orders

1. Open `/admin/orders` to see all orders.
2. Kitchen staff can open `/staff/kitchen`.
3. New orders appear with status and customer details.
4. Staff update the order status as it moves from pending to preparing, ready, and delivered.

### Managing Rooms

1. Open `/admin/rooms`.
2. Add or update room name, description, price, capacity, amenities, and images.
3. Keep unavailable rooms hidden from the public listing when needed.
4. Reception staff can monitor bookings from `/staff/reception`.

### Managing Events And Tickets

1. Open `/admin/events`.
2. Add event title, date, location, ticket price, capacity, description, and image.
3. Published events appear on `/events`.
4. Ticket sales are tracked in the admin dashboard and analytics.

### Managing Liquor And Bar Stock

1. Open `/admin/liquor`.
2. Add liquor items with SKU, category, bottle or serving size, cost price, selling price, stock count, threshold, and image.
3. Use restock when new stock arrives.
4. Use wastage when stock is damaged, expired, spilled, or lost.
5. Sales reduce stock and create transaction records.
6. Low-stock items are highlighted so management can reorder early.

### Managing Gallery Photos

1. Open `/admin/gallery`.
2. Upload photos from service moments, events, rooms, dining, and guest experiences.
3. Add a title and optional description.
4. Publish only the images that should appear on the public gallery page.

## 6. Dashboard And Reporting

The admin dashboard gives management a snapshot of:

- Today and recent revenue
- Orders, bookings, tickets, and liquor performance
- Pending operational work
- Low-stock liquor items
- Recent customer activity
- Best-performing menu items

The goal is to help the manager quickly answer:

- What is selling well?
- What stock is running low?
- Which bookings or orders need attention?
- Which services are generating the most income?
- What should be promoted or reduced?

## 7. Demo Flow For A Business Manager

Recommended presentation order:

1. Start on the home page and show the clean customer-facing experience.
2. Open the menu and add a food item to cart.
3. Show rooms and explain online booking.
4. Show events and ticket purchasing.
5. Open the bar page and show drinks, pricing, and stock-aware availability.
6. Open the gallery and explain that the business can market real service moments.
7. Sign in as admin and open `/admin/dashboard`.
8. Show orders, rooms, events, liquor stock, gallery, and users.
9. Open kitchen or reception panel to show staff-specific workflows.

## 8. Security And Reliability Notes

- Admin and staff pages require sign-in.
- Customer registration does not create staff or admin accounts.
- Staff accounts are created and controlled by admin users.
- API routes are protected by authentication and rate limiting.
- Passwords are stored securely as hashes.
- Environment variables are used for database, Supabase, JWT, and payment credentials.
- No production secrets should be placed directly in the codebase.

## 9. Recommended Admin Routine

Daily:

- Check dashboard revenue and pending work.
- Review kitchen orders and room bookings.
- Confirm low-stock liquor items.
- Update unavailable menu, room, or event items.

Weekly:

- Review analytics.
- Add new gallery photos.
- Update prices where needed.
- Review staff users and deactivate unused accounts.

Monthly:

- Export or review sales records.
- Compare best-selling and slow-moving items.
- Adjust promotions, stock purchases, and event planning.

## 10. Support Notes

If login fails:

- Confirm the email and password are correct.
- Confirm the account is active in admin users.
- Confirm the user has the correct role for the route.
- Customer accounts cannot access admin or staff workspaces.

If stock does not appear on the bar page:

- Confirm the liquor item status is active.
- Confirm current stock is greater than zero.
- Confirm the item has a selling price and category.

If an image does not show:

- Re-upload the image from the admin page.
- Use clear landscape photos where possible.
- Avoid very large files for faster loading.

## 11. Key Client Message

MshindiServe is designed to reduce manual coordination, present the business professionally online, and give management a single place to monitor sales, bookings, tickets, staff activity, gallery content, and bar inventory.
