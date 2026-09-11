"use client";

import { useState } from "react";

export default function DownloadPage({
  params,
}: {
  params: { token: string };
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "認証に失敗しました");
      }

      // 認証成功 → ファイルサーバーから直接ダウンロード
      window.location.href = `/api/file/${params.token}`;

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "エラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "100px auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>画像ダウンロード</h1>

      <p>
        ダウンロードするには
        パスワードを入力してください。
      </p>

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            download();
          }
        }}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={download}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
        }}
      >
        {loading ? "認証中..." : "ダウンロード"}
      </button>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}
    </main>
  );
}
