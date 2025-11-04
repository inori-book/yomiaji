# YOMIAJI: βテスト版

読み味で探す"毒書"体験

## 📖 概要

YOMIAJIは、読む前の自分には戻れなくなるような"毒書"を、読後感（読み味）から探すことができる書籍検索アプリケーションです。

## ✨ 主な機能

- **キーワード検索**: フリーテキストまたは候補から検索
- **読み味分析**: 感想文から形容詞・形容動詞を抽出
- **楽天ブックス連携**: 書影、価格、出版社情報を表示
- **レスポンシブデザイン**: スマートフォンからデスクトップまで対応
- **ユーザー評価**: 5段階評価システム

## 🚀 技術スタック

- **フロントエンド**: Next.js 15, React, TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Next.js API Routes
- **自然言語処理**: MeCab (Python)
- **外部API**: 楽天ブックスAPI
- **データ処理**: Pandas, CSV

## 🛠️ セットアップ

### 前提条件

- Node.js 18以上
- Python 3.8以上
- MeCab (日本語形態素解析)

### インストール

1. リポジトリをクローン（既にクローン済みの場合は不要）
```bash
git clone https://github.com/inori-book/yomiaji.git
cd yomiaji
```

2. **フロントエンド（Next.js）の依存関係をインストール**
```bash
npm install
```

3. **バックエンド（Python API）の依存関係をインストール**
```bash
cd python
pip install -r requirements.txt
cd ..
```

4. **環境変数を設定**
```bash
# フロントエンド用（Railway APIのURLを指定）
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# バックエンド用（Python API用）
echo "RAKUTEN_APP_ID=your_rakuten_app_id_here" >> python/.env
```

5. **開発サーバーを起動**

**ターミナル1: Python API（バックエンド）**
```bash
cd python
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**ターミナル2: Next.js（フロントエンド）**
```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

### 本番環境との違い

- **本番環境**: 
  - Next.js (フロントエンド) → Netlify
  - FastAPI (バックエンド) → Railway
  - `/api/*` は Netlify のリダイレクト経由で Railway に接続

- **ローカル環境**:
  - Next.js → `http://localhost:3000`
  - FastAPI → `http://localhost:8000`
  - `/api/*` は `netlify.toml` のリダイレクト設定が効かないため、直接 FastAPI を呼び出す設定が必要

## 📊 データ構造

- `public/database.csv`: 書籍データ（タイトル、著者、感想、ジャンル、ISBN）
- `public/abstractwords.txt`: 追加抽出対象の抽象語
- `public/stopwords.txt`: 除外対象のストップワード

## 🔧 API エンドポイント

- `POST /api/search`: 書籍検索
- `GET /api/keywords`: キーワード一覧取得
- `GET /api/rakuten`: 楽天ブックス情報取得
- `GET /api/ratings`: ユーザー評価取得

## 📱 レスポンシブ対応

- **スマートフォン**: 375px幅最適化
- **タブレット**: 768px以上で横並びレイアウト
- **デスクトップ**: 1200px以上で3カラム表示

## 🎯 バージョン履歴

- **v1.2.0**: 楽天API最適化とレスポンシブ改善
- **v1.0-complete**: 初期完成版

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストやイシューの報告を歓迎します。

## 📞 お問い合わせ

プロジェクトに関する質問やフィードバックは、GitHubのIssuesまでお願いします。