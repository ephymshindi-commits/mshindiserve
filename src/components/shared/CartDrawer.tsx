"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, CheckCircle2, Loader2, Minus, Plus, ShoppingBag, Smartphone, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePaymentPoller } from "@/hooks/usePaymentPoller";
import { ordersApi, paymentsApi } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { labelFromEnum } from "@/lib/visuals";
import { useCartStore } from "@/store/cartStore";

type CheckoutStep = "cart" | "payment" | "success";
type ConfirmedOrder = {
  id: string;
  number: string;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED";
  mpesaRef?: string | null;
  message?: string;
  tableNumber?: string | null;
};

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

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [tableError, setTableError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

  const total = totalAmount();
  const paymentPoller = usePaymentPoller({
    resourceId: confirmedOrder?.id,
    resourceType: "order",
    enabled: step === "success" && confirmedOrder?.paymentStatus === "PENDING",
    onCompleted: (mpesaRef) => {
      setConfirmedOrder((current) =>
        current ? { ...current, paymentStatus: "COMPLETED", mpesaRef } : current
      );
      clearCart();
    },
    onFailed: (reason) => {
      setConfirmedOrder((current) =>
        current ? { ...current, paymentStatus: "FAILED", message: reason } : current
      );
      toast.error(reason);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("table");
    const saved = window.localStorage.getItem("ms-table-number");
    const initial = (fromUrl || saved || "").trim().slice(0, 10);
    if (initial) setTableNumber(initial);
  }, []);

  useEffect(() => {
    const value = tableNumber.trim();
    if (value) window.localStorage.setItem("ms-table-number", value);
    else window.localStorage.removeItem("ms-table-number");
  }, [tableNumber]);

  function handleCheckout() {
    const normalizedTable = tableNumber.trim();
    if (!normalizedTable) {
      setTableError("Enter a table number before checkout.");
      return;
    }

    setTableNumber(normalizedTable);
    setTableError("");
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
      const normalizedTable = tableNumber.trim();
      const orderRes = await ordersApi.create({
        items: items.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        tableNumber: normalizedTable,
      });

      const order = orderRes.data.data;
      setConfirmedOrder({
        id: order.id,
        number: order.orderNumber,
        paymentStatus: "PENDING",
        tableNumber: order.tableNumber ?? normalizedTable,
        message: "Order created. Waiting for payment confirmation.",
      });
      setStep("success");
      clearCart();

      try {
        const paymentRes = await paymentsApi.stkPush({ phoneNumber: normalizedPhone, orderId: order.id });
        const paymentMessage = paymentRes.data.data?.message;
        setConfirmedOrder((current) =>
          current ? { ...current, message: paymentMessage ?? current.message } : current
        );
      } catch (err: any) {
        const message =
          err?.response?.data?.error ??
          "M-Pesa prompt could not be sent. Use the demo success button to continue.";
        setConfirmedOrder((current) => (current ? { ...current, message } : current));
        toast.error(message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Checkout failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSimulatePayment() {
    if (!confirmedOrder) return;

    setIsSimulating(true);
    try {
      const res = await paymentsApi.simulateOrder({
        orderId: confirmedOrder.id,
        phoneNumber: phone.replace(/\s/g, "") || undefined,
      });
      const data = res.data.data;
      setConfirmedOrder((current) =>
        current
          ? {
              ...current,
              paymentStatus: "COMPLETED",
              mpesaRef: data.mpesaRef,
              message: "Demo payment confirmed. The kitchen has received this order.",
            }
          : current
      );
      toast.success("Demo payment confirmed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Could not simulate payment.");
    } finally {
      setIsSimulating(false);
    }
  }

  function handleClose() {
    closeCart();
    setStep("cart");
    setPhone("");
    setPhoneError("");
    setTableError("");
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
                    <label className="block">
                      <span className="text-xs font-medium text-zinc-500">Table number</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tableNumber}
                        onChange={(e) => {
                          setTableNumber(e.target.value.trim().slice(0, 10));
                          setTableError("");
                        }}
                        placeholder="1"
                        className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                      {tableError && <p className="mt-1 text-xs text-red-600">{tableError}</p>}
                    </label>
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
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-zinc-500">Table</span>
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {tableNumber.trim()}
                    </span>
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
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                    confirmedOrder?.paymentStatus === "FAILED"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                      : confirmedOrder?.paymentStatus === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {confirmedOrder?.paymentStatus === "FAILED" ? (
                    <AlertCircle size={30} />
                  ) : confirmedOrder?.paymentStatus === "COMPLETED" ? (
                    <CheckCircle2 size={30} />
                  ) : (
                    <Loader2 size={30} className="animate-spin" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">
                  {confirmedOrder?.paymentStatus === "COMPLETED"
                    ? "Payment confirmed"
                    : confirmedOrder?.paymentStatus === "FAILED"
                      ? "Payment not confirmed"
                      : "Waiting for M-Pesa confirmation"}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  {confirmedOrder?.paymentStatus === "COMPLETED"
                    ? "Your payment is confirmed and the kitchen has received your order."
                    : confirmedOrder?.paymentStatus === "FAILED"
                      ? confirmedOrder.message ?? "We could not confirm payment. Check your M-Pesa messages before trying again."
                      : confirmedOrder?.message ?? "Check your phone and enter your M-Pesa PIN. We will update this order as soon as confirmation arrives."}
                </p>

                {paymentPoller.isPolling && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Waiting for M-Pesa confirmation... {Math.ceil(paymentPoller.secondsRemaining)}s remaining
                  </div>
                )}

                {confirmedOrder && confirmedOrder.paymentStatus !== "COMPLETED" && (
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    {isSimulating ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Simulate Payment Success
                  </button>
                )}

                {confirmedOrder && (
                  <div className="mt-6 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs text-zinc-500">Order number</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
                      {confirmedOrder.number}
                    </p>
                    {confirmedOrder.tableNumber && (
                      <>
                        <p className="mt-3 text-xs text-zinc-500">Table</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">
                          Table {confirmedOrder.tableNumber}
                        </p>
                      </>
                    )}
                    {confirmedOrder.mpesaRef && (
                      <>
                        <p className="mt-3 text-xs text-zinc-500">M-Pesa reference</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {confirmedOrder.mpesaRef}
                        </p>
                      </>
                    )}
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
    </>
  );
}
