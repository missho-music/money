"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

interface Row {
  rank: number;
  classNumber: number;
  name: string;
  earned: number;
  isMe: boolean;
}

interface Board {
  enabled: boolean;
  period: string;
  useNickname?: boolean;
  rows: Row[];
}

const PERIODS = [
  { id: "week", label: "本星期" },
  { id: "month", label: "本月" },
  { id: "term", label: "全學期" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("term");
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBoard(null);
    api<Board>(`leaderboard?period=${period}`)
      .then(setBoard)
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入排行榜"));
  }, [period]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">班別排行</h1>
        <p className="text-sm text-muted-foreground">排名按累積獲得的寵物金幣計算。購物不會令名次下跌。你只會看到自己班別。</p>
      </div>
      <div className="flex gap-2">
        {PERIODS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setPeriod(entry.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${period === entry.id ? "bg-primary text-primary-foreground" : "bg-white ring-1 ring-foreground/10"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!board && !error && <p className="text-sm text-muted-foreground">正在計算排名…</p>}
      {board && !board.enabled && (
        <p className="rounded-3xl bg-white p-4 text-sm ring-1 ring-foreground/5">老師已關閉排行榜。</p>
      )}
      {board?.enabled && (
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-foreground/5">
          {board.useNickname && <p className="px-4 pt-3 text-xs text-muted-foreground">目前以課堂顯示名稱列出。</p>}
          {board.rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">這個時段還沒有獲得金幣的紀錄。</p>}
          {board.rows.map((row) => (
            <div key={`${row.classNumber}-${row.rank}`} className={`flex items-center justify-between px-4 py-3 text-sm ${row.isMe ? "bg-amber-50" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="w-8 font-display text-lg text-primary">{row.rank}</span>
                <span>{row.classNumber} {row.name}{row.isMe ? "（你）" : ""}</span>
              </div>
              <span>{row.earned}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
