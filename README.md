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

1. リポジトリをクローン
```bash
git clone https://github.com/inori-book/yomiaji.git
cd yomiaji
```

2. 依存関係をインストール
```bash
npm install
pip install -r requirements.txt
```

3. 環境変数を設定
```bash
cp .env.local.example .env.local
# .env.localに楽天ブックスAPIキーを設定
```

4. 開発サーバーを起動
```bash
npm run dev
```

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