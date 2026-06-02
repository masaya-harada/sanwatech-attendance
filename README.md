# サンワテック 勤怠管理システム

スマホから出退勤をGPS制限付きで打刻できる、シンプルな勤怠管理アプリです。

## セットアップ手順

### 1. Supabaseプロジェクトを作成
1. [supabase.com](https://supabase.com) で新規プロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. Settings > API から URL と anon key を確認

### 2. 環境変数を設定
`.env.local` を編集して、Supabaseの情報を入力：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. 会社の座標を設定
`lib/geo.ts` を開いて、実際の会社の座標に変更：
```ts
export const COMPANY_LAT = 35.0500;  // ← 実際の緯度
export const COMPANY_LNG = 137.0100; // ← 実際の経度
```

### 4. 従業員のPINを変更
`supabase/schema.sql` の初期データのPINを変更して再実行（または Supabase の Table Editor で直接編集）

### 5. 開発サーバー起動
```bash
npm install
npm run dev
```

### 6. Vercelにデプロイ
```bash
vercel --prod
```

## 機能
- 名前選択 + 4桁PIN認証
- GPS位置確認（半径100m以内で打刻可能）
- 出勤・退勤ボタン（大きなUI）
- 管理者ダッシュボード（月別勤怠一覧）
- 残業時間自動計算（8時間超過分）
- CSVダウンロード

## アカウント（初期設定）
| 名前 | PIN | 権限 |
|------|-----|------|
| 田中 太郎 | 1234 | 一般 |
| 佐藤 花子 | 2345 | 一般 |
| 鈴木 一郎 | 3456 | 一般 |
| 山田 次郎 | 4567 | 一般 |
| 伊藤 三郎 | 5678 | 一般 |
| 管理者 | 0000 | 管理者 |
