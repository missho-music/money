"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, api, formatWhen } from "@/lib/api";

interface Wallet {
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

interface Home {
  student: { studentId: string };
  wallet: Wallet;
}

interface Transaction {
  transactionId: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  earn: "獲得",
  spend: "使用",
  adjust: "修正",
  refund: "退回",
};

export default function StudentPointsPage() {
  const [home, setHome] = useState<Home | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Home>("pets/home")
      .then(async (profile) => {
        setHome(profile);
        setRows(await api<Transaction[]>(`points/transactions?studentId=${encodeURIComponent(profile.student.studentId)}`));
      })
      .catch((reason) => setError(reason instanceof ApiError ? reason.message : "未能載入積分"));
  }, []);

  async function changePassword() {
    try {
      await api("auth/password", { method: "POST", body: { currentPassword, nextPassword } });
      setCurrentPassword("");
      setNextPassword("");
      toast.success("密碼已更新");
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "未能更新密碼");
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!home) return <p className="text-sm text-muted-foreground">正在讀取金幣紀錄…</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">寵物金幣</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="可使用" value={home.wallet.currentBalance} />
        <Card label="累積獲得" value={home.wallet.lifetimeEarned} />
        <Card label="已花費" value={home.wallet.lifetimeSpent} />
      </div>
      <p className="text-sm text-muted-foreground">購物只會減少可使用金幣，不會減少累積獲得。積分不能由學生自行修改。</p>
      <section className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
        <h2 className="font-medium">交易紀錄</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">還沒有金幣紀錄。</p>}
        {rows.map((row) => (
          <div key={row.transactionId} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
            <div>
              <p>{row.reason}</p>
              <p className="text-xs text-muted-foreground">{TYPE_LABEL[row.type] ?? row.type} · {formatWhen(row.createdAt)}</p>
            </div>
            <p className={row.amount >= 0 ? "text-emerald-700" : "text-amber-700"}>{row.amount > 0 ? `+${row.amount}` : row.amount}</p>
          </div>
        ))}
      </section>
      <section className="max-w-md space-y-2 rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
        <h2 className="font-medium">更改登入密碼</h2>
        <p className="text-sm text-muted-foreground">新密碼需為 8 至 72 個字元。只輸入學號不能進入帳戶。</p>
        <Input className="h-10" type="password" placeholder="目前密碼" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <Input className="h-10" type="password" placeholder="新密碼" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
        <Button className="h-10" onClick={changePassword}>更新密碼</Button>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl bg-white p-4 ring-1 ring-foreground/5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-3xl text-amber-600">{value}</p>
    </article>
  );
}
