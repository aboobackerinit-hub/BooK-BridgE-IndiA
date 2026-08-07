import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
const CHAT_STATUSES = ["Interested", "Chat Started", "Sold", "Completed", "Cancelled"];

const statusColor = (s) => {
  const map = {
    New: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    Processing: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    Packed: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    Shipped: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    Delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    Cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    "Interested": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "Chat Started": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    "Sold": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    "Completed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
  };
  return map[s] || "bg-muted";
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    setLoading(true);
    api.get("/orders")
      .then((r) => setOrders(r.data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.put(`/orders/${orderId}/status`, { status: "Cancelled" });
      toast.success("Order cancelled successfully!");
      loadOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to cancel order");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">History</div>
        <h1 className="font-serif text-4xl">My Orders</h1>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3" />
          No orders yet.
        </Card>
      ) : (
        orders.map((o) => (
          <Card key={o.id} className="p-6 relative overflow-hidden" data-testid={`order-${o.id}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Order #</div>
                <div className="font-mono font-semibold">{o.order_no}</div>
              </div>
              <div className="flex items-center gap-2">
                {!["Cancelled", "Completed", "Shipped", "Delivered"].includes(o.status) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelOrder(o.id)}
                    className="rounded-full text-xs h-8 px-3 font-medium bg-rose-600 hover:bg-rose-700 text-white"
                    data-testid={`cancel-order-${o.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancel Order
                  </Button>
                )}
                <Badge className={statusColor(o.status)}>{o.status}</Badge>
              </div>
            </div>

            {/* Status pipeline */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
              {(o.is_chat_order ? CHAT_STATUSES : STATUSES).filter((s) => s !== "Cancelled").map((s, i) => {
                const arr = o.is_chat_order ? CHAT_STATUSES : STATUSES;
                const currentIdx = arr.indexOf(o.status);
                const done = i <= currentIdx && o.status !== "Cancelled";
                return (
                  <React.Fragment key={s}>
                    <div className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${done ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"}`}>{s}</div>
                    {i < arr.length - 2 && <div className={`h-0.5 w-6 ${done && i < currentIdx ? "bg-primary" : "bg-muted"}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Action for chat order */}
            {o.is_chat_order && o.status === "Sold" && (
              <div className="mb-4">
                <Button size="sm" onClick={async () => {
                  await api.put(`/orders/${o.id}/status`, { status: "Completed" });
                  toast.success("Order marked as received!");
                  loadOrders();
                }} className="rounded-full w-full" data-testid={`mark-completed-${o.id}`}>
                  Mark as Received
                </Button>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {o.items.map((it, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="w-12 h-16 rounded bg-muted overflow-hidden shrink-0">
                    {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground">by {it.author} · × {it.quantity}</div>
                  </div>
                  <div className="font-mono text-sm font-semibold">₹{it.price * it.quantity}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3 h-3" /> {o.address}
              </div>
              <div className="font-mono font-bold text-primary text-base">Total: ₹{o.total}</div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default OrdersPage;
