"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  calcDistanceMeters,
  isWithinCompany,
  ALLOWED_RADIUS_METERS,
} from "@/lib/geo";

type GpsState = "checking" | "ok" | "far" | "denied";
type TodayLog = { id: string; clock_in: string | null; clock_out: string | null };

export default function ClockPage() {
  const router = useRouter();
  const [staffName, setStaffName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [gpsState, setGpsState] = useState<GpsState>("checking");
  const [distance, setDistance] = useState<number | null>(null);
  const [todayLog, setTodayLog] = useState<TodayLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const name = sessionStorage.getItem("staff_name");
    const id = sessionStorage.getItem("staff_id");
    if (!name || !id) { router.push("/"); return; }
    setStaffName(name);
    setStaffId(id);
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkGps = useCallback(() => {
    setGpsState("checking");
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = calcDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          35.05,
          137.01
        );
        setDistance(Math.round(dist));
        setGpsState(isWithinCompany(pos.coords.latitude, pos.coords.longitude) ? "ok" : "far");
      },
      () => setGpsState("denied"),
      { timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const fetchTodayLog = useCallback(async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("attendance_logs")
      .select("id, clock_in, clock_out")
      .eq("staff_id", id)
      .eq("work_date", today)
      .single();
    setTodayLog(data ?? null);
  }, []);

  useEffect(() => {
    if (staffId) {
      checkGps();
      fetchTodayLog(staffId);
    }
  }, [staffId, checkGps, fetchTodayLog]);

  async function handleClockIn() {
    setLoading(true);
    setMessage("");
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("attendance_logs")
      .insert({ staff_id: staffId, clock_in: new Date().toISOString(), work_date: today })
      .select()
      .single();
    setLoading(false);
    if (error) { setMessage("エラーが発生しました"); return; }
    setTodayLog(data);
    setMessage("出勤打刻しました！");
  }

  async function handleClockOut() {
    if (!todayLog) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("attendance_logs")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", todayLog.id)
      .select()
      .single();
    setLoading(false);
    if (error) { setMessage("エラーが発生しました"); return; }
    setTodayLog(data);
    setMessage("退勤打刻しました！お疲れさまでした。");
  }

  function formatTime(iso: string | null) {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  const canClockIn = gpsState === "ok" && !todayLog?.clock_in;
  const canClockOut = gpsState === "ok" && !!todayLog?.clock_in && !todayLog?.clock_out;
  const alreadyDone = !!todayLog?.clock_in && !!todayLog?.clock_out;

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-black text-white tracking-widest">サンワテック</h1>
        <p className="text-blue-200 text-2xl font-bold mt-1">{staffName} さん</p>
        <p className="text-blue-300 text-xl mt-1">
          {now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          　{now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        {/* GPS状態 */}
        <div className={`rounded-2xl p-4 mb-5 text-center ${
          gpsState === "ok" ? "bg-green-50 border-2 border-green-400" :
          gpsState === "far" ? "bg-red-50 border-2 border-red-400" :
          gpsState === "denied" ? "bg-yellow-50 border-2 border-yellow-400" :
          "bg-gray-50 border-2 border-gray-300"
        }`}>
          {gpsState === "checking" && <p className="text-gray-600 font-bold text-lg">📍 現在地を確認中...</p>}
          {gpsState === "ok" && <p className="text-green-700 font-bold text-lg">✅ 会社の範囲内です</p>}
          {gpsState === "far" && (
            <>
              <p className="text-red-700 font-black text-lg">⚠️ 会社に近づいて打刻してください</p>
              {distance !== null && (
                <p className="text-red-600 text-base mt-1">
                  現在地から約 <span className="font-black text-2xl">{distance}m</span> 離れています
                  　（半径{ALLOWED_RADIUS_METERS}m以内で打刻可能）
                </p>
              )}
            </>
          )}
          {gpsState === "denied" && (
            <p className="text-yellow-700 font-bold text-lg">
              📵 位置情報を許可してください
            </p>
          )}
          {gpsState !== "checking" && (
            <button onClick={checkGps} className="mt-2 text-blue-600 font-bold text-sm underline">
              再確認する
            </button>
          )}
        </div>

        {/* 本日の記録 */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <p className="text-gray-500 font-bold text-center mb-2">本日の打刻</p>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-gray-500 text-sm">出勤</p>
              <p className="text-blue-700 text-3xl font-black">{formatTime(todayLog?.clock_in ?? null)}</p>
            </div>
            <div className="text-gray-300 text-3xl self-center">｜</div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">退勤</p>
              <p className="text-blue-700 text-3xl font-black">{formatTime(todayLog?.clock_out ?? null)}</p>
            </div>
          </div>
        </div>

        {/* メッセージ */}
        {message && (
          <p className="text-center text-green-600 font-black text-xl mb-4">{message}</p>
        )}

        {alreadyDone && !message && (
          <p className="text-center text-gray-500 font-bold text-lg mb-4">本日の打刻は完了しています</p>
        )}

        {/* 打刻ボタン */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleClockIn}
            disabled={!canClockIn || loading}
            className="py-8 bg-green-500 text-white text-3xl font-black rounded-2xl shadow-lg hover:bg-green-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🟢　出　勤
          </button>
          <button
            onClick={handleClockOut}
            disabled={!canClockOut || loading}
            className="py-8 bg-orange-500 text-white text-3xl font-black rounded-2xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔴　退　勤
          </button>
        </div>

        {/* ログアウト */}
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
