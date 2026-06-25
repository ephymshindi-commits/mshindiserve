"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Smartphone, Trash2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { AuthModal } from "@/components/shared/AuthModal";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { labelFromEnum } from "@/lib/visuals";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";

type CheckoutStep = "cart" | "payment" | "success";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
  } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ number: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const total = totalAmount();

  function handleCheckout() {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setStep("payment");
  }

  async function handlePay() {
    const normalizedPhone = phone.replace(/\s/g, "");
    if (!/^(\+254|0)[17]\d{8}$/.test(normalizedPhone)) {
      setPhoneError("Enter a valid Safaricom number, for example 0712345678");
      return;
    }

    setPhoneError("");
    setIsLoading(true);

    try {
      const orderRes = await ordersApi.create({
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });

      const order = orderRes.data.data;
      await paymentsApi.stkPush({ phoneNumber: normalizedPhone, orderId: order.id });

      setConfirmedOrder({ number: order.orderNumber });
      setStep("success");
      clearCart();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Checkout failed. Please try again.");
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

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-white">
                <ShoppingBag size={18} className="text-amber-600" />
                Your order {items.length > 0 ? `(${items.length})` : ""}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            {step === "cart" && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {items.length === 0 ? (
                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        <ShoppingBag size={26} />
                      </div>
                      <p className="text-sm font-medium text-zinc-950 dark:text-white">
                        Your cart is empty
                      </p>
                      <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">
                        Add a few dishes from the menu and they will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.menuItem.id} className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {labelFromEnum(item.menuItem.category).slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="line-clamp-1 text-sm font-medium text-zinc-950 dark:text-white">
                                  {item.menuItem.name}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {formatKES(item.menuItem.price)} each
                                </p>
                              </div>
                              <button
                                onClick={() => removeItem(item.menuItem.id)}
                                className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                aria-label={`Remove ${item.menuItem.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                {formatKES(item.menuItem.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="space-y-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-semibold text-zinc-950 dark:text-white">
                        {formatKES(total)}
                      </span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="h-11 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      Checkout
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "payment" && (
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
                <div>
                  <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                    Pay via M-Pesa
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Enter your Safaricom number. You will receive a prompt to confirm payment.
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.menuItem.id} className="flex justify-between gap-3 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {item.menuItem.name} x {item.quantity}
                        </span>
                        <span className="font-medium">{formatKES(item.menuItem.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-sm font-semibold dark:border-zinc-800">
                    <span>Total</span>
                    <span className="text-amber-700 dark:text-amber-400">{formatKES(total)}</span>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-zinc-500">M-Pesa phone number</span>
                  <div className="relative mt-1.5">
                    <Smartphone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneError("");
                      }}
                      placeholder="+254 712 345 678"
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
                </label>

                <div className="space-y-2">
                  <button
                    onClick={handlePay}
                    disabled={isLoading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
                    {isLoading ? "Sending prompt" : `Send prompt - ${formatKES(total)}`}
                  </button>
                  <button
                    onClick={() => setStep("cart")}
                    className="h-10 w-full text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Back to cart
                  </button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 size={30} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
                  Order placed
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Check your phone to complete the payment. The kitchen will confirm your order
                  once payment is received.
                </p>

                {confirmedOrder && (
                  <div className="mt-6 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs text-zinc-500">Order number</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
                      {confirmedOrder.number}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="mt-6 h-11 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Done
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          setStep("payment");
        }}
      />
    </>
  );
}
