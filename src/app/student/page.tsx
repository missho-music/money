"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PetSprite, type PetType } from "@/components/pet-art";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";

interface Species { type: PetType; name: string; element: string; blurb: string }
interface Home {
  student: { classNumber: number; studentName: string; displayName: string };
  wallet: { currentBalance: number; lifetimeEarned: number; lifetimeSpent: number; pendingExp: number };
  expPerCoin: number;
  detail: null | {
    pet: { name: string; petType: PetType; level: number; exp: number };
    species: Species;
    progress: { into: number; need: number };
    combat: { final: { hp: number; attack: number; defense: number; speed: number; criticalRate: number } };
    slots: Record<string, { item: { name: string } } | null>;
  };
}

const SLOT_LABEL: Record<string, string> = { weapon: "武器", armor: "防具", headgear: "頭飾", accessory: "飾品", appearance: "造型" };

export default function StudentHomePage() {
  const [home, setHome] = useState<Home | null>(null);
  const [choices, setChoices] = useState<Species[]>([]);
  const [name, setName] = useState("");
  const [happy, setHappy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [profile, pets] = await Promise.all([api<Home>("pets/home"), api<Species[]>("pets/choices")]);
    setHome(profile);
    setChoices(pets);
    setName(profile.detail?.pet.name ?? "");
  }
  useEffect(() => { load().catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入寵物")); }, []);

  async function choose(type: PetType) {
    try {
      await api("pets/choose", { method: "POST", body: { petType: type, name: name || undefined } });
      toast.success("夥伴來了");
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能選擇寵物");
    }
  }

  async function rename() {
    try {
      await api("pets/rename", { method: "POST", body: { name } });
      toast.success("已改名");
      await load();
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能改名");
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!home) return <p className="text-sm text-muted-foreground">正在找你的夥伴…</p>;

  if (!home.detail) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold">選一隻初始夥伴</h1>
        <p className="text-sm text-muted-foreground">四種寵物初期能力大致平衡，之後會按自己的方向成長。之前賺到的經驗會在選擇時一次過給牠。</p>
        <Input className="h-11 max-w-sm" placeholder="幫牠取名，可留空" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="grid gap-3 md:grid-cols-2">
          {choices.map((pet) => (
            <button key={pet.type} type="button" onClick={() => choose(pet.type)} className="rounded-3xl bg-white p-4 text-left ring-1 ring-foreground/5 transition hover:-translate-y-0.5">
              <PetSprite type={pet.type} className="mx-auto h-36 w-36" />
              <p className="font-display text-xl">{pet.name}</p>
              <p className="text-sm text-primary">{pet.element}</p>
              <p className="mt-1 text-sm text-muted-foreground">{pet.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { detail } = home;
  const width = Math.round((detail.progress.into / detail.progress.need) * 100);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky-100 via-emerald-50 to-lime-200 p-6">
        <div className="absolute inset-x-8 bottom-0 h-24 rounded-t-[100%] bg-emerald-400/50" />
        <button type="button" className="relative mx-auto block" onClick={() => { setHappy(true); setTimeout(() => setHappy(false), 700); }}>
          <PetSprite type={detail.pet.petType} happy={happy} className="mx-auto h-64 w-64" />
        </button>
        <div className="relative mt-2 text-center">
          <p className="font-display text-3xl">{detail.pet.name}</p>
          <p className="text-sm text-muted-foreground">{detail.species.name} · {detail.species.element} · Lv.{detail.pet.level}</p>
        </div>
      </section>
      <section className="space-y-4">
        <article className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
          <p className="text-sm text-muted-foreground">寵物金幣</p>
          <p className="font-display text-4xl text-amber-600">{home.wallet.currentBalance}</p>
          <p className="text-xs text-muted-foreground">累積獲得 {home.wallet.lifetimeEarned} · 已花費 {home.wallet.lifetimeSpent}</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-3 bg-primary" style={{ width: `${width}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">經驗 {detail.progress.into}/{detail.progress.need} · 每枚金幣 {home.expPerCoin} EXP</p>
        </article>
        <article className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-4 ring-1 ring-foreground/5 text-sm">
          <Stat label="生命" value={detail.combat.final.hp} />
          <Stat label="攻擊" value={detail.combat.final.attack} />
          <Stat label="防禦" value={detail.combat.final.defense} />
          <Stat label="速度" value={detail.combat.final.speed} />
          <Stat label="暴擊" value={`${detail.combat.final.criticalRate}%`} />
        </article>
        <article className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5 text-sm">
          {Object.entries(SLOT_LABEL).map(([slot, label]) => (
            <p key={slot}>{label}：{detail.slots[slot]?.item.name ?? "空"}</p>
          ))}
          <div className="mt-3 flex gap-2">
            <Button nativeButton={false} render={<Link href="/student/shop" />} className="h-10">去商店</Button>
            <Button nativeButton={false} variant="secondary" render={<Link href="/student/inventory" />} className="h-10">背包</Button>
          </div>
        </article>
        <article className="flex gap-2">
          <Input className="h-10" value={name} onChange={(event) => setName(event.target.value)} />
          <Button className="h-10" onClick={rename}>改名</Button>
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}
