"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api, idempotencyKey } from "@/lib/api";

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  criticalRate: number;
}

interface Item {
  itemId: string;
  name: string;
  category: string;
  categoryLabel: string;
  rarity: string;
  rarityLabel: string;
  price: number;
  description: string;
  stock: number | null;
  purchaseLimit: number | null;
  minLevel: number;
  slotLabel: string | null;
  statsBonus: Stats;
}

interface Home {
  wallet: { currentBalance: number };
  detail: null | { pet: { level: number } };
}

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "weapon", label: "武器" },
  { id: "armor", label: "防具" },
  { id: "headgear", label: "頭飾" },
  { id: "accessory", label: "飾品" },
  { id: "consumable", label: "消耗品" },
  { id: "cosmetic", label: "造型" },
];

function bonusText(stats: Stats) {
  const parts = [
    stats.attack ? `攻擊 +${stats.attack}` : "",
    stats.defense ? `防禦 +${stats.defense}` : "",
    stats.hp ? `生命 +${stats.hp}` : "",
    stats.speed ? `速度 +${stats.speed}` : "",
    stats.criticalRate ? `暴擊 +${stats.criticalRate}%` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "沒有能力加成";
}

export default function StudentShopPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [home, setHome] = useState<Home | null>(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Item | null>(null);
  const [bought, setBought] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef("");

  async function load() {
    const [catalog, profile] = await Promise.all([api<Item[]>("items"), api<Home>("pets/home")]);
    setItems(catalog);
    setHome(profile);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入商店"));
  }, []);

  function openItem(item: Item) {
    keyRef.current = idempotencyKey("buy");
    setBought(null);
    setSelected(item);
  }

  async function buy() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await api<{ wallet: { currentBalance: number } }>("shop/purchase", {
        method: "POST",
        body: { itemId: selected.itemId, idempotencyKey: keyRef.current },
      });
      setBought(selected.name);
      setHome((current) => (current ? { ...current, wallet: result.wallet } : current));
      toast.success(`已把${selected.name}放進背包`);
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能完成購買");
    } finally {
      setBusy(false);
    }
  }

  const balance = home?.wallet.currentBalance ?? 0;
  const level = home?.detail?.pet.level ?? 1;
  const visible = items.filter((item) => filter === "all" || item.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">虛擬商店</h1>
          <p className="text-sm text-muted-foreground">用寵物金幣買裝備。金幣不足時不能購買，餘額不會變成負數。</p>
        </div>
        <p className="rounded-full bg-amber-100 px-4 py-2 font-display text-lg text-amber-700">{balance} 金幣</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${filter === entry.id ? "bg-primary text-primary-foreground" : "bg-white ring-1 ring-foreground/10"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {!home && !error && <p className="text-sm text-muted-foreground">正在打開商店…</p>}
      {home && visible.length === 0 && <p className="text-sm text-muted-foreground">這個分類暫時沒有商品。</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((item) => {
          const short = balance < item.price;
          const locked = level < item.minLevel;
          return (
            <article key={item.itemId} className={`rounded-3xl bg-white p-4 rarity-${item.rarity}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.categoryLabel} · {item.rarityLabel}</p>
                </div>
                <p className="font-display text-xl text-amber-600">{item.price}</p>
              </div>
              <p className="mt-2 text-sm">{item.description}</p>
              <p className="mt-1 text-sm text-primary">{bonusText(item.statsBonus)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.slotLabel ? `裝備欄：${item.slotLabel}` : "不能裝備"}
                {item.minLevel > 1 ? ` · 需要 ${item.minLevel} 級` : ""}
                {item.stock != null ? ` · 剩餘 ${item.stock}` : ""}
                {item.purchaseLimit != null ? ` · 每人限購 ${item.purchaseLimit}` : ""}
              </p>
              <Button className="mt-3 h-10" disabled={short || locked || item.stock === 0} onClick={() => openItem(item)}>
                {item.stock === 0 ? "已售罄" : locked ? `需要 ${item.minLevel} 級` : short ? `還差 ${item.price - balance} 金幣` : "查看並購買"}
              </Button>
            </article>
          );
        })}
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{selected.categoryLabel} · {selected.rarityLabel}</p>
              <p>{selected.description}</p>
              <p className="text-sm">{bonusText(selected.statsBonus)}</p>
              <p className="text-sm">售價 {selected.price} 金幣 · 你目前有 {balance} 金幣</p>
              {selected.category === "consumable" && (
                <p className="text-sm text-muted-foreground">消耗品會放進背包。對戰尚未開放，暫時不能使用。</p>
              )}
              {bought === selected.name && (
                <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  購買成功，道具已在背包。
                </motion.p>
              )}
              <div className="flex gap-2">
                <Button className="h-10" disabled={busy || balance < selected.price || bought === selected.name} onClick={buy}>
                  {busy ? "處理中…" : "確認購買"}
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setSelected(null)}>關閉</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
