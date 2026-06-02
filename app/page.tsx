"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const STAFF_NAMES = ["田中 太郎", "佐藤 花子", "鈴木 一郎", "山田 次郎", "伊藤 三郎"];

export default function LoginPage() {
  const router = useRouter();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function appendPin(digit: string) {
    if (pin.length < 4) setPin((p) => p + digit);
  }

  function clearPin() {
    setPin("");
    setError("");
  }

  async function handleLogin() {
    if (!selectedName) {
      setError("名前を選んでください");
      return;
    }
    if (pin.length !== 4) {
      setError("4桁のPINを入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: dbErr } = await supabase
      .from("staff")
      .select("id, name, is_admin")
      .eq("name", selectedName)
      .eq("pin", pin)
      .single();

    setLoading(false);

    if (dbErr || !data) {
      setError("PINが違います。もう一度確認してください。");
      setPin("");
      return;
    }

    sessionStorage.setItem("staff_id", data.id);
    sessionStorage.setItem("staff_name", data.name);
    sessionStorage.setItem("is_admin", String(data.is_admin));

    if (data.is_admin) {
      router.push("/admin");
    } else {
      router.push("/clock");
    }
  }

  return (
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black text-white tracking-widest mb-2">
          サンワテック
        </h1>
        <p className="text-blue-200 text-xl">勤怠管理システム</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        {/* 名前選択 */}
        <p className="text-gray-600 text-lg font-bold mb-3 text-center">
          あなたの名前を選んでください
        </p>
        <div className="flex flex-col gap-3 mb-6">
          {STAFF_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => {
                setSelectedName(name);
                setPin("");
                setError("");
              }}
              className={`py-4 rounded-2xl text-xl font-bold border-2 transition-all ${
                selectedName === name
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                  : "bg-white text-gray-800 border-gray-300 hover:border-blue-400"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* PIN表示 */}
        {selectedName && (
          <>
            <p className="text-gray-600 text-lg font-bold mb-3 text-center">
              4桁のPINを入力
            </p>
            <div className="flex justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-3xl font-black ${
                    pin.length > i
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-300"
                  }`}
                >
                  {pin.length > i ? "●" : "○"}
                </div>
              ))}
            </div>

            {/* テンキー */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
                (key, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (key === "⌫") setPin((p) => p.slice(0, -1));
                      else if (key !== "") appendPin(key);
                    }}
                    disabled={key === ""}
                    className={`h-16 rounded-2xl text-2xl font-bold transition-all ${
                      key === ""
                        ? "invisible"
                        : key === "⌫"
                        ? "bg-red-100 text-red-600 hover:bg-red-200 active:scale-95"
                        : "bg-gray-100 text-gray-800 hover:bg-blue-100 active:scale-95 active:bg-blue-200"
                    }`}
                  >
                    {key}
                  </button>
                )
              )}
            </div>

            {error && (
              <p className="text-red-500 text-center font-bold mb-3">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || pin.length !== 4}
              className="w-full py-5 bg-blue-600 text-white text-2xl font-black rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "確認中..." : "ログイン"}
            </button>
            <button
              onClick={clearPin}
              className="w-full mt-3 py-3 text-gray-500 text-lg font-bold"
            >
              クリア
            </button>
          </>
        )}
      </div>
    </div>
  );
}
