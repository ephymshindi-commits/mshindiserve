"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import toast from "react-hot-toast";
import { X, Minus, Plus, ShoppingBag, Smartphone, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { AuthModal } from "@/components/shared/AuthModal";

type CheckoutStep = "cart" | "payment" | "success";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, clearCart, totalAmount } =
    useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ number: string; mpesaRef: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  function handleCheckout() {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setStep("payment");
  }

  async function handlePay() {
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError("Enter a valid Safaricom number (e.g. 0712 345 678)");
      return;
    }
    setPhoneError("");
    setIsLoading(true);

    try {
      // 1. Create the order
      const orderRes = await ordersApi.create({
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      const order = orderRes.data.data;

      // 2. Initiate M-Pesa STK Push
      await paymentsApi.stkPush({ phoneNumber: phone, orderId: order.id });

      setConfirmedOrder({ number: order.orderNumber, mpesaRef: "Awaiting confirmation" });
      setStep("success");
      clearCart();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Payment failed — please try again");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    closeCart();
    setStep("cart");
    setPhone("");
    setPhoneError("");
    setConfirmedOrder(null);
  }

  const total = totalAmount();

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(o) => !o && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col animate-slide-left">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-600" />
                <span className="font-semibold text-zinc-900 dark:text-white">
                  Your order {items.length > 0 && `(${items.length})`}
                </span>
              </div>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X size={18} className="text-zinc-500" />
                </button>
              </Dialog.Close>
            </div>

            {/* ── STEP: CART ── */}
            {step === "cart" && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">🛒</div>
                      <p className="text-zinc-500 text-sm">Your cart is empty</p>
                      <p className="text-zinc-400 text-xs mt-1">
                        Add items from the menu to get started
                      </p>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.menuItem.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                          {item.menuItem.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {item.menuItem.name}
                          </p>
                          <p className="text-xs text-amber-600 font-medium">
                            {formatKES(item.menuItem.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-medium w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {items.length > 0 && (
                  <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {formatKES(total)}
                      </span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Checkout → {formatKES(total)}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── STEP: PAYMENT ── */}
            {step === "payment" && (
              <div className="flex-1 px-5 py-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                    Pay via M-Pesa
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Enter your Safaricom number. You'll receive a prompt to confirm.
                  </p>
                </div>

                {/* Order summary */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                  {items.map((i) => (
                    <div key={i.menuItem.id} className="flex justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {i.menuItem.emoji} {i.menuItem.name} ×{i.quantity}
                      </span>
                      <span className="font-medium">{formatKES(i.menuItem.price * i.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-amber-600">{formatKES(total)}</span>
                  </div>
                </div>

                {/* Phone input */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                      placeholder="+254 712 345 678"
                      className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>

                <button
                  onClick={handlePay}
                  disabled={isLoading}
                  className="w-full py-3 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Smartphone size={16} />
                  )}
                  {isLoading ? "Sending STK Push…" : `Send M-Pesa Prompt · ${formatKES(total)}`}
                </button>

                <button
                  onClick={() => setStep("cart")}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-700"
                >
                  ← Back to cart
                </button>
              </div>
            )}

            {/* ── STEP: SUCCESS ── */}
            {step === "success" && (
              <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  Order placed!
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Check your phone to confirm the M-Pesa payment.
                  Your order will be confirmed once payment is received.
                </p>
                {confirmedOrder && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 w-full mb-6">
                    <p className="text-xs text-zinc-500">Order number</p>
                    <p className="font-mono font-semibold text-amber-600 text-lg">
                      {confirmedOrder.number}
                    </p>
                  </div>
                )}

                {/* Tracking steps */}
                <div className="flex w-full justify-between mb-6">
                  {["Received", "Confirmed", "Preparing", "Ready", "Delivered"].map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                          i === 0
                            ? "bg-amber-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {i === 0 ? "✓" : i + 1}
                      </div>
                      <span className="text-[10px] text-zinc-500">{s}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Auth gate */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => { setShowAuth(false); setStep("payment"); }}
      />
    </>
  );
}
