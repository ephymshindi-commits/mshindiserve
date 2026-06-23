/**
 * M-Pesa Daraja API Integration
 * Safaricom STK Push (Lipa Na M-Pesa Online)
 * Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */

const MPESA_BASE_URL =
  process.env.MPESA_ENV === "PRODUCTION"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

/**
 * Step 1: Get OAuth access token from Daraja
 */
export async function getMpesaToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`M-Pesa token error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Step 2: Generate the Base64 password required for STK Push
 * Format: Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss

  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  const password = Buffer.from(raw).toString("base64");

  return { password, timestamp };
}

/**
 * Step 3: Initiate STK Push — sends prompt to customer's phone
 */
export async function initiateStkPush({
  phoneNumber,
  amount,
  reference,
  description,
}: {
  phoneNumber: string;
  amount: number; // full KES amount, e.g. 1500
  reference: string; // e.g. "MS-1234"
  description: string; // e.g. "Fine Breeze Food Order"
}): Promise<{
  CheckoutRequestID: string;
  MerchantRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}> {
  const token = await getMpesaToken();
  const { password, timestamp } = generatePassword();

  // Normalize phone: 0712345678 → 254712345678
  const phone = phoneNumber.replace(/^0/, "254").replace(/^\+/, "");

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount), // M-Pesa requires whole numbers
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: reference.slice(0, 12), // max 12 chars
    TransactionDesc: description.slice(0, 13), // max 13 chars
  };

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STK Push failed: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Step 4 (callback): Parse the M-Pesa callback body
 * Called by Safaricom servers after the customer confirms/cancels
 */
export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number; // 0 = success
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export function parseMpesaCallback(body: MpesaCallbackBody): {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: string;
  resultDesc: string;
  mpesaRef?: string;
  amount?: number;
  phoneNumber?: string;
  transactionDate?: string;
} {
  const cb = body.Body.stkCallback;
  const success = cb.ResultCode === 0;

  const get = (name: string) =>
    cb.CallbackMetadata?.Item.find((i) => i.Name === name)?.Value;

  return {
    success,
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    resultCode: String(cb.ResultCode),
    resultDesc: cb.ResultDesc,
    mpesaRef: success ? String(get("MpesaReceiptNumber") ?? "") : undefined,
    amount: success ? Number(get("Amount")) : undefined,
    phoneNumber: success ? String(get("PhoneNumber") ?? "") : undefined,
    transactionDate: success ? String(get("TransactionDate") ?? "") : undefined,
  };
}
