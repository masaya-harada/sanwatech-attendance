"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type LogRow = {
  id: string;
  staff_name: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const start = `${month}-01`;
    const endDate = new Date(
      parseInt(month.split("-")[0]),
      parseInt(month.split("-")[1]),
      0
    );
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;

    const { data } = await supabase
      .from("attendance_logs")
      .select("id, staff_id, work_date, clock_in, clock_out, staff(name)")
      .gte("work_date", start)
      .lte("work_date", end)
      .order("work_date", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: LogRow[] = ((data ?? []) as any[]).map((row) => {
      let work_minutes: number | null = null;
      let overtime_minutes: number | null = null;
      if (row.clock_in && row.clock_out) {
        work_minutes = Math.round(
          (new Date(row.clock_out).getTime() - new Date(row.clock_in).getTime()) / 60000
        );
        overtime_minutes = Math.max(0, work_minutes - 480);
      }
      return {
        id: row.id,
        staff_name: row.staff?.name ?? "不明",
        work_date: row.work_date,
        clock_in: row.clock_in,
        clock_out: row.clock_out,
        work_minutes,
        overtime_minutes,
      };
    });

    setLogs(rows);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_admin");
    if (isAdmin !== "true") { router.push("/"); return; }
    fetchLogs();
  }, [fetchLogs, router]);

  function formatTime(iso: string | null) {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  function formatMinutes(min: number | null) {
    if (min === null) return "--:--";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}時間${String(m).padStart(2, "0")}分`;
  }

  function downloadCsv() {
    const header = "氏名,日付,出勤,退勤,実労働時間,残業時間\n";
    const body = logs
      .map((r) =>
        [
          r.staff_name,
          r.work_date,
          formatTime(r.clock_in),
          formatTime(r.clock_out),
          formatMinutes(r.work_minutes),
          r.overtime_minutes !== null ? formatMinutes(r.overtime_minutes) : "--",
        ].join(",")
      )
      .join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `勤怠_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-blue-900 text-white rounded-3xl p-6 mb-6 text-center">
          <h1 className="text-3xl font-black tracking-widest">サンワテック</h1>
          <p className="text-blue-200 text-lg mt-1">管理者ダッシュボード</p>
        </div>

        {/* 月選択 */}
        <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow">
          <button onClick={prevMonth} className="text-3xl px-4 py-2 text-blue-600 font-black">‹</button>
          <span className="text-2xl font-black text-gray-800">
            {month.replace("-", "年")}月
          </span>
          <button onClick={nextMonth} className="text-3xl px-4 py-2 text-blue-600 font-black">›</button>
        </div>

        {/* CSV出力 */}
        <div className="mb-4">
          <button
            onClick={downloadCsv}
            className="w-full py-4 bg-green-600 text-white text-xl font-black rounded-2xl shadow hover:bg-green-700 active:scale-95 transition-all"
          >
            📥　CSVダウンロード
          </button>
        </div>

        {/* テーブル */}
        {loading ? (
          <div className="text-center py-10 text-gray-500 font-bold text-xl">読み込み中...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-bold text-xl bg-white rounded-2xl shadow">
            この月の打刻データがありません
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-900 text-white">
                  <tr>
                    <th className="py-3 px-3 text-left font-bold">氏名</th>
                    <th className="py-3 px-3 text-left font-bold">日付</th>
                    <th className="py-3 px-3 text-center font-bold">出勤</th>
                    <th className="py-3 px-3 text-center font-bold">退勤</th>
                    <th className="py-3 px-3 text-center font-bold">実労働</th>
                    <th className="py-3 px-3 text-center font-bold">残業</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="py-3 px-3 font-bold text-gray-800">{row.staff_name}</td>
                      <td className="py-3 px-3 text-gray-600">{row.work_date}</td>
                      <td className="py-3 px-3 text-center text-green-700 font-bold">
                        {formatTime(row.clock_in)}
                      </td>
                      <td className="py-3 px-3 text-center text-orange-600 font-bold">
                        {formatTime(row.clock_out)}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700">
                        {formatMinutes(row.work_minutes)}
                      </td>
                      <td className={`py-3 px-3 text-center font-bold ${
                        (row.overtime_minutes ?? 0) > 0 ? "text-red-600" : "text-gray-400"
                      }`}>
                        {row.overtime_minutes !== null && row.overtime_minutes > 0
                          ? formatMinutes(row.overtime_minutes)
                          : "−"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={() => { sessionStorage.clear(); router.push("/"); }}
          className="w-full mt-6 py-3 text-gray-400 font-bold text-lg"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
