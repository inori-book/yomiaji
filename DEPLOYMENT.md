# デプロイメント手順

## Railway側（Python API）

### 1. Railwayでサービスを作成
- 「New Project」→「Deploy from GitHub repo」
- リポジトリを選択

### 2. デプロイ設定
- **Root Directory**: `python` を指定
- **Dockerfile**: `python/Dockerfile` を使用
- **Start Command**: 未指定（DockerfileのCMDを使用）

または、**Container Image**を選択してDockerイメージをデプロイ

### 3. 環境変数設定
```
RAKUTEN_APP_ID=your-rakuten-app-id
PORT=8000
```

### 4. Health Check設定
- Path: `/health`
- Port: `$PORT`

### 5. デプロイ完了後、URLをメモ
例: `https://yomiaji-api.up.railway.app`

---

## Vercel側（Next.js）

### 1. Vercelでプロジェクトを作成
- 「New Project」→「Import Git Repository」
- リポジトリを選択

### 2. vercel.jsonの設定
`vercel.json`の`<YOUR-PYTHON-API-URL>`をRailwayのURLに置き換え：
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://yomiaji-api.up.railway.app/$1"
    }
  ]
}
```

### 3. 環境変数設定（オプション）
Vercel Dashboard → Settings → Environment Variables:
```
RAKUTEN_APP_ID=your-rakuten-app-id
```

### 4. デプロイ
- Git push で自動デプロイ
- または「Redeploy」をクリック

---

## GitHub Actions Warmup設定

### 1. GitHub Secretsを設定
Settings → Secrets and variables → Actions → New repository secret:
- `PYTHON_API_URL`: RailwayのPython API URL
  - 例: `https://yomiaji-api.up.railway.app`

### 2. ワークフローの確認
`.github/workflows/warmup.yml`が15分間隔でPython APIをウォームアップします。

---

## 確認

### Railway側
```bash
curl https://<your-railway-url>/health
# {"status":"ok"} が返ることを確認
```

### Vercel側
```bash
curl https://<your-vercel-url>/api/health
# {"status":"ok"} が返ることを確認
```

---

## トラブルシューティング

### Railwayでエラーが出る場合
1. ログを確認: Railway Dashboard → Deployments → Logs
2. Health Checkが `/health` に設定されているか確認
3. 環境変数`RAKUTEN_APP_ID`が設定されているか確認

### Vercelで/api/*が404になる場合
1. `vercel.json`のURLが正しいか確認
2. RailwayのURLが正しく動作しているか確認
3. Vercel Dashboard → Settings → Environment Variables を確認

