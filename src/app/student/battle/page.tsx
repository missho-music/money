"use client";

import { useEffect, useState } from "react";
import { PetSprite, type PetType } from "@/components/pet-art";
import { ApiError, api } from "@/lib/api";

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  criticalRate: number;
}

interface Home {
  battleEnabled: false;
  detail: null | {
    pet: { name: string; petType: PetType; level: number };
    species: { name: string; element: string };
    combat: { base: Stats; levelBonus: Stats; equipmentBonus: Stats; final: Stats };
    slots: Record<string, { item: { name: string } } | null>;
  };
}

const ROWS: { key: keyof Stats; label: string; suffix?: string }[] = [
  { key: "hp", label: "生命" },
  { key: "attack", label: "攻擊" },
  { key: "defense", label: "防禦" },
  { key: "speed", label: "速度" },
  { key: "criticalRate", label: "暴擊", suffix: "%" },
];

const SLOT_LABEL: Record<string, string> = {
  weapon: "武器",
  armor: "防具",
  headgear: "頭飾",
  accessory: "飾品",
  appearance: "造型",
};

export default function BattlePrepPage() {
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Home>("pets/home")
      .then(setHome)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入對戰準備"));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!home) return <p className="text-sm text-muted-foreground">正在整理對戰資料…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">對戰準備</h1>
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          完整對戰尚未開放。學生對戰、回合制、技能、Boss 和班級合作都還未實作，這頁不能開始戰鬥。
        </p>
      </div>
      {!home.detail && <p className="text-sm text-muted-foreground">請先選擇寵物，系統才可以計算對戰能力。</p>}
      {home.detail && (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl bg-white p-4 text-center ring-1 ring-foreground/5">
            <PetSprite type={home.detail.pet.petType} className="mx-auto h-40 w-40" />
            <p className="font-display text-2xl">{home.detail.pet.name}</p>
            <p className="text-sm text-muted-foreground">{home.detail.species.name} · {home.detail.species.element} · Lv.{home.detail.pet.level}</p>
            <div className="mt-3 space-y-1 text-left text-sm">
              {Object.entries(SLOT_LABEL).map(([slot, label]) => (
                <p key={slot}>{label}：{home.detail?.slots[slot]?.item.name ?? "空"}</p>
              ))}
            </div>
          </section>
          <section className="overflow-x-auto rounded-3xl bg-white ring-1 ring-foreground/5">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">能力</th>
                  <th className="px-4 py-3 font-medium">基礎</th>
                  <th className="px-4 py-3 font-medium">等級加成</th>
                  <th className="px-4 py-3 font-medium">裝備加成</th>
                  <th className="px-4 py-3 font-medium">最終</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const combat = home.detail!.combat;
                  const suffix = row.suffix ?? "";
                  return (
                    <tr key={row.key} className="border-t">
                      <td className="px-4 py-3">{row.label}</td>
                      <td className="px-4 py-3">{combat.base[row.key]}{suffix}</td>
                      <td className="px-4 py-3">+{combat.levelBonus[row.key]}{suffix}</td>
                      <td className="px-4 py-3">+{combat.equipmentBonus[row.key]}{suffix}</td>
                      <td className="px-4 py-3 font-medium">{combat.final[row.key]}{suffix}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-muted-foreground">最終能力 = 基礎能力 + 等級成長 + 裝備加成。學生不能自行改這些數字。</p>
          </section>
        </div>
      )}
    </div>
  );
}
