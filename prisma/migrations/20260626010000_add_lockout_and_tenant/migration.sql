ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "tenant_config" (
  "id" TEXT NOT NULL,
  "businessName" TEXT NOT NULL DEFAULT 'Fine Breeze Bar & Grill',
  "tagline" TEXT DEFAULT 'Where Every Moment is Crafted to Perfection',
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#f59e0b',
  "accentColor" TEXT NOT NULL DEFAULT '#1c1917',
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "currencySymbol" TEXT NOT NULL DEFAULT 'KES ',
  "mpesaShortcode" TEXT,
  "supportPhone" TEXT DEFAULT '+254 700 000 000',
  "supportEmail" TEXT DEFAULT 'info@finebreeze.co.ke',
  "address" TEXT DEFAULT 'Westlands, Nairobi, Kenya',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  "features" JSONB NOT NULL DEFAULT '{"rooms":true,"events":true,"bar":true,"kitchen":true,"concierge":true,"mpesa":true}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenant_config_pkey" PRIMARY KEY ("id")
);
