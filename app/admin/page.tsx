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

type StaffRow = {
  id: string;
  name: string;
  pin: string;
};

type Tab = "attendance" | "staff";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("attendance");

  // ── 勤怠タブ ──────────────────────────────
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    const start = `${month}-01`;
    const endDate = new Date(parseInt(month.split("-")[0]), parseInt(month.split("-")[1]), 0);
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
    setLoadingLogs(false);
  }, [month]);

  // ── 従業員タブ ────────────────────────────
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [staffMsg, setStaffMsg] = useState("");

  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    const { data } = await supabase
      .from("staff")
      .select("id, name, pin")
      .eq("is_admin", false)
      .order("name");
    setStaffList(data ?? []);
    setLoadingStaff(false);
  }, []);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_admin");
    if (isAdmin !== "true") { router.push("/"); return; }
    fetchLogs();
    fetchStaff();
  }, [fetchLogs, fetchStaff, router]);

  async function saveEdit(id: string) {
    if (!editName.trim()) { setStaffMsg("名前を入力してください"); return; }
    if (editPin.length !== 4 || !/^\d{4}$/.test(editPin)) { setStaffMsg("PINは4桁の数字です"); return; }
    const { error } = await supabase
      .from("staff")
      .update({ name: editName.trim(), pin: editPin })
      .eq("id", id);
    if (error) { setStaffMsg("保存に失敗しました"); return; }
    setEditId(null);
    setStaffMsg("✅ 保存しました");
    setTimeout(() => setStaffMsg(""), 3000);
    fetchStaff();
  }

  async function deleteStaff(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await supabase.from("staff").delete().eq("id", id);
    setStaffMsg("削除しました");
    setTimeout(() => setStaffMsg(""), 3000);
    fetchStaff();
  }

  async function addStaff() {
    if (!newName.trim()) { setStaffMsg("名前を入力してください"); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setStaffMsg("PINは4桁の数字です"); return; }
    const { error } = await supabase
      .from("staff")
      .insert({ name: newName.trim(), pin: newPin, is_admin: false });
    if (error) { setStaffMsg("追加失敗（名前が重複している可能性があります）"); return; }
    setNewName("");
    setNewPin("");
    setStaffMsg("✅ 追加しました");
    setTimeout(() => setStaffMsg(""), 3000);
    fetchStaff();
  }

  function formatTime(iso: string | null) {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  function formatMinutes(min: number | null) {
    if (min === null) return "--";
    return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}m`;
  }

  function downloadCsv() {
    const header = "氏名,日付,出勤,退勤,実労働時間,残業時間\n";
    const body = logs.map((r) =>
      [r.staff_name, r.work_date, formatTime(r.clock_in), formatTime(r.clock_out),
       formatMinutes(r.work_minutes), r.overtime_minutes != null && r.overtime_minutes > 0 ? formatMinutes(r.overtime_minutes) : "−"].join(",")
    ).join("\n");
    const blob = new Blob(["﻿" + header + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `勤怠_${month}.csv`;
    a.click();
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

        {/* タブ */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("attendance")}
            className={`flex-1 py-3 rounded-2xl text-lg font-black transition-all ${
              tab === "attendance" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-500"
            }`}
          >
            📋 勤怠一覧
          </button>
          <button
            onClick={() => setTab("staff")}
            className={`flex-1 py-3 rounded-2xl text-lg font-black transition-all ${
              tab === "staff" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-500"
            }`}
          >
            👤 従業員管理
          </button>
        </div>

        {/* ── 勤怠タブ ── */}
        {tab === "attendance" && (
          <>
            <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow">
              <button onClick={prevMonth} className="text-3xl px-4 text-blue-600 font-black">‹</button>
              <span className="text-2xl font-black text-gray-800">{month.replace("-", "年")}月</span>
              <button onClick={nextMonth} className="text-3xl px-4 text-blue-600 font-black">›</button>
            </div>
            <button
              onClick={downloadCsv}
              className="w-full py-4 bg-green-600 text-white text-xl font-black rounded-2xl shadow hover:bg-green-700 active:scale-95 transition-all mb-4"
            >
              📥　CSVダウンロード
            </button>
            {loadingLogs ? (
              <div className="text-center py-10 text-gray-400 font-bold text-xl">読み込み中...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-bold text-xl bg-white rounded-2xl shadow">この月のデータがありません</div>
            ) : (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="py-3 px-3 text-left">氏名</th>
                        <th className="py-3 px-3 text-left">日付</th>
                        <th className="py-3 px-3 text-center">出勤</th>
                        <th className="py-3 px-3 text-center">退勤</th>
                        <th className="py-3 px-3 text-center">実働</th>
                        <th className="py-3 px-3 text-center">残業</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="py-3 px-3 font-bold text-gray-800">{row.staff_name}</td>
                          <td className="py-3 px-3 text-gray-600">{row.work_date}</td>
                          <td className="py-3 px-3 text-center text-green-700 font-bold">{formatTime(row.clock_in)}</td>
                          <td className="py-3 px-3 text-center text-orange-600 font-bold">{formatTime(row.clock_out)}</td>
                          <td className="py-3 px-3 text-center text-gray-700">{formatMinutes(row.work_minutes)}</td>
                          <td className={`py-3 px-3 text-center font-bold ${(row.overtime_minutes ?? 0) > 0 ? "text-red-600" : "text-gray-300"}`}>
                            {(row.overtime_minutes ?? 0) > 0 ? formatMinutes(row.overtime_minutes) : "−"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 従業員管理タブ ── */}
        {tab === "staff" && (
          <>
            {staffMsg && (
              <div className={`text-center font-bold text-lg py-3 px-4 rounded-2xl mb-4 ${staffMsg.startsWith("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {staffMsg}
              </div>
            )}

            {/* 新規追加 */}
            <div className="bg-white rounded-2xl shadow p-5 mb-4">
              <p className="font-black text-gray-700 text-lg mb-3">➕ 新しい従業員を追加</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="名前（例：山本 四郎）"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  className="w-24 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg text-center focus:border-blue-400 focus:outline-none"
                />
              </div>
              <button
                onClick={addStaff}
                className="w-full py-3 bg-blue-600 text-white text-lg font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
              >
                追加する
              </button>
            </div>

            {/* 従業員一覧 */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-blue-900 text-white px-5 py-3">
                <p className="font-black text-lg">従業員一覧</p>
              </div>
              {loadingStaff ? (
                <div className="text-center py-8 text-gray-400 font-bold">読み込み中...</div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-bold">従業員がいません</div>
              ) : (
                staffList.map((s) => (
                  <div key={s.id} className="border-b last:border-b-0 px-5 py-4">
                    {editId === s.id ? (
                      // 編集モード
                      <div>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 border-2 border-blue-400 rounded-xl px-4 py-3 text-lg focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editPin}
                            onChange={(e) => setEditPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            maxLength={4}
                            className="w-24 border-2 border-blue-400 rounded-xl px-4 py-3 text-lg text-center focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(s.id)}
                            className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 font-black rounded-xl hover:bg-gray-300 active:scale-95 transition-all"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 表示モード
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-black text-gray-800">{s.name}</p>
                          <p className="text-gray-400 text-sm">PIN: {s.pin}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditId(s.id); setEditName(s.name); setEditPin(s.pin); setStaffMsg(""); }}
                            className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 active:scale-95 transition-all"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deleteStaff(s.id, s.name)}
                            className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 active:scale-95 transition-all"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
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
