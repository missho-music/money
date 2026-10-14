"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api, formatWhen, idempotencyKey } from "@/lib/api";

interface Reward {
  rewardId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface Order {
  orderId: string;
  itemName: string;
  totalPrice: number;
  status: string;
  orderType: string;
  createdAt: string;
  note: string | null;
}

interface Home {
  wallet: { currentBalance: number };
}

const STATUS: Record<string, string> = {
  pending: "待領取",
  fulfilled: "已領取",
  cancelled: "已取消",
};

export default function StudentRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [selected, setSelected] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef("");

  async function load() {
    const [catalog, history, profile] = await Promise.all([
      api<Reward[]>("rewards"),
      api<Order[]>("orders"),
      api<Home>("pets/home"),
    ]);
    setRewards(catalog);
    setOrders(history.filter((order) => order.orderType === "physical"));
    setBalance(profile.wallet.currentBalance);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入禮物"));
  }, []);

  function openReward(reward: Reward) {
    keyRef.current = idempotencyKey("gift");
    setSelected(reward);
  }

  async function redeem() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await api("rewards/redeem", {
        method: "POST",
        body: { rewardId: selected.rewardId, idempotencyKey: keyRef.current },
      });
      toast.success("已建立兌換訂單，請向老師領取");
      setSelected(null);
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能兌換");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">實體禮物</h1>
          <p className="text-sm text-muted-foreground">兌換後金幣會扣除，訂單狀態是待領取。老師派發後才會變成已領取。缺貨取消時金幣會退回。</p>
        </div>
        <p className="rounded-full bg-amber-100 px-4 py-2 font-display text-lg text-amber-700">{balance ?? "—"} 金幣</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {balance == null && !error && <p className="text-sm text-muted-foreground">正在讀取禮物櫃…</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {rewards.map((reward) => {
          const short = balance != null && balance < reward.price;
          return (
            <article key={reward.rewardId} className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{reward.name}</p>
                  <p className="text-sm text-muted-foreground">庫存 {reward.stock}</p>
                </div>
                <p className="font-display text-xl text-amber-600">{reward.price}</p>
              </div>
              <p className="mt-2 text-sm">{reward.description}</p>
              <Button className="mt-3 h-10" disabled={reward.stock < 1 || short} onClick={() => openReward(reward)}>
                {reward.stock < 1 ? "缺貨" : short ? `還差 ${reward.price - (balance ?? 0)} 金幣` : "兌換"}
              </Button>
            </article>
          );
        })}
      </div>
      <section className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
        <h2 className="font-medium">我的兌換</h2>
        {orders.length === 0 && <p className="mt-2 text-sm text-muted-foreground">還沒有兌換紀錄。</p>}
        <div className="mt-2 space-y-2">
          {orders.map((order) => (
            <div key={order.orderId} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p>{order.itemName}</p>
                <p className="text-xs text-muted-foreground">{formatWhen(order.createdAt)} · {order.totalPrice} 金幣{order.note ? ` · ${order.note}` : ""}</p>
              </div>
              <p>{STATUS[order.status] ?? order.status}</p>
            </div>
          ))}
        </div>
      </section>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader><DialogTitle>確認兌換 {selected.name}</DialogTitle></DialogHeader>
              <p className="text-sm">將扣除 {selected.price} 金幣。你目前有 {balance} 金幣。確認後請在課堂向老師領取。</p>
              <div className="flex gap-2">
                <Button className="h-10" disabled={busy} onClick={redeem}>{busy ? "處理中…" : "確認兌換"}</Button>
                <Button variant="outline" className="h-10" onClick={() => setSelected(null)}>返回</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
