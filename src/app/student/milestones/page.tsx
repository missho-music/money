"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

interface Milestone {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  progress: number;
}

export default function MilestonesPage() {
  const [rows, setRows] = useState<Milestone[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ milestones: Milestone[] }>("pets/home")
      .then((home) => setRows(home.milestones))
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入里程碑"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">里程碑</h1>
        <p className="text-sm text-muted-foreground">這些進度由你的寵物、金幣和抽籤紀錄即時計算。完整成就系統尚未開放，這裡沒有可領取的額外獎勵。</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!rows && !error && <p className="text-sm text-muted-foreground">正在核對紀錄…</p>}
      <div className="grid gap-3">
        {rows?.map((row) => (
          <article key={row.id} className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">{row.detail}</p>
              </div>
              <p className="text-sm text-primary">{row.done ? "已達成" : "進行中"}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-2 bg-primary" style={{ width: `${Math.round(row.progress * 100)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
