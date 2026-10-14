"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  criticalRate: number;
}

interface CatalogItem {
  itemId: string;
  name: string;
  categoryLabel: string;
  rarity: string;
  rarityLabel: string;
  slot: string | null;
  slotLabel: string | null;
  statsBonus: Stats;
  description: string;
}

interface InventoryRow {
  inventoryId: string;
  item: CatalogItem | null;
}

interface SlotEntry {
  inventoryId: string;
  item: CatalogItem;
}

interface Home {
  detail: null | {
    pet: { name: string; level: number };
    combat: { final: Stats };
    slots: Record<string, SlotEntry | null>;
    inventory: InventoryRow[];
  };
}

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器",
  armor: "防具",
  headgear: "頭飾",
  accessory: "飾品",
  appearance: "造型",
};

const STATS: { key: keyof Stats; label: string; suffix?: string }[] = [
  { key: "hp", label: "生命" },
  { key: "attack", label: "攻擊" },
  { key: "defense", label: "防禦" },
  { key: "speed", label: "速度" },
  { key: "criticalRate", label: "暴擊", suffix: "%" },
];

function preview(final: Stats, slots: Record<string, SlotEntry | null>, item: CatalogItem) {
  if (!item.slot) return final;
  const current = slots[item.slot]?.item.statsBonus;
  const next = { ...final };
  for (const stat of STATS) {
    next[stat.key] = final[stat.key] - (current?.[stat.key] ?? 0) + item.statsBonus[stat.key];
  }
  return next;
}

export default function InventoryPage() {
  const [home, setHome] = useState<Home | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setHome(await api<Home>("pets/home"));
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入背包"));
  }, []);

  async function equip(inventoryId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api("pets/equip", { method: "POST", body: { inventoryId } });
      toast.success("已裝備");
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能裝備");
    } finally {
      setBusy(false);
    }
  }

  async function unequip(slot: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api("pets/unequip", { method: "POST", body: { slot } });
      toast.success("已卸下");
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能卸下");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!home) return <p className="text-sm text-muted-foreground">正在打開背包…</p>;
  if (!home.detail) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">背包</h1>
        <p className="text-sm text-muted-foreground">請先在寵物頁選擇夥伴，之後才可以裝備道具。</p>
      </div>
    );
  }

  const { detail } = home;
  const equippedIds = new Set(
    Object.values(detail.slots).map((slot) => slot?.inventoryId).filter((id): id is string => Boolean(id)),
  );
  const selected = detail.inventory.find((row) => row.inventoryId === picked)?.item ?? null;
  const next = selected ? preview(detail.combat.final, detail.slots, selected) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">背包</h1>
        <p className="text-sm text-muted-foreground">{detail.pet.name} · Lv.{detail.pet.level}。每個欄位一次只能裝備一件，能力由系統計算。</p>
      </div>
      <section className="grid gap-2 sm:grid-cols-5">
        {Object.entries(SLOT_LABEL).map(([slot, label]) => {
          const worn = detail.slots[slot];
          return (
            <article key={slot} className="rounded-2xl bg-white p-3 ring-1 ring-foreground/5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{worn?.item.name ?? "空"}</p>
              {worn && (
                <Button variant="outline" className="mt-2 h-8" disabled={busy} onClick={() => unequip(slot)}>卸下</Button>
              )}
            </article>
          );
        })}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-2">
          {detail.inventory.length === 0 && <p className="text-sm text-muted-foreground">背包是空的。去商店買第一件裝備吧。</p>}
          {detail.inventory.map((row) => (
            <button
              key={row.inventoryId}
              type="button"
              onClick={() => setPicked(row.inventoryId)}
              className={`flex w-full items-center justify-between rounded-2xl bg-white p-3 text-left ring-1 ${picked === row.inventoryId ? "ring-primary" : "ring-foreground/5"}`}
            >
              <span>
                <span className="block font-medium">{row.item?.name ?? "已下架的道具"}</span>
                <span className="text-xs text-muted-foreground">{row.item?.categoryLabel} · {row.item?.rarityLabel}</span>
              </span>
              <span className="text-xs text-primary">{equippedIds.has(row.inventoryId) ? "裝備中" : "未裝備"}</span>
            </button>
          ))}
        </div>
        <aside className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
          {!selected && <p className="text-sm text-muted-foreground">選一件道具，查看裝備後的能力變化。</p>}
          {selected && next && (
            <div className="space-y-3">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              {STATS.map((stat) => (
                <p key={stat.key} className="flex justify-between text-sm">
                  <span>{stat.label}</span>
                  <span>
                    {detail.combat.final[stat.key]}{stat.suffix ?? ""}
                    {next[stat.key] !== detail.combat.final[stat.key] ? ` → ${next[stat.key]}${stat.suffix ?? ""}` : ""}
                  </span>
                </p>
              ))}
              {selected.slot ? (
                <Button className="h-10" disabled={busy || equippedIds.has(picked ?? "")} onClick={() => picked && equip(picked)}>
                  {equippedIds.has(picked ?? "") ? "已經裝備" : `裝備到${selected.slotLabel}`}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">這件道具不能裝備。消耗品要等對戰功能開放後才可以使用。</p>
              )}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
