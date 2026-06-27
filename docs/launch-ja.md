# AgentRisk 日本語ローンチメモ

## まず直すべきこと

現在の npm バッジが `package not found` になる場合、npm registry に `agentrisk` がまだ公開されていません。公開前の準備中なら問題ありませんが、宣伝開始後は信頼を落とすので、告知前に必ず npm 公開するか、README の npm バッジを外して GitHub 経由の実行導線に切り替えます。

README は npm バッジと `npx agentrisk ...` の導線を前面に出しています。npm 公開前に一時的に GitHub 経由の実行導線へ切り替えた場合は、公開後に必ず npm badge と `npx` へ戻します。

推奨順序:

1. `npm whoami` で npm ログイン状態を確認する
2. `npm pack --dry-run` で含まれるファイルを確認する
3. `npm publish` で `agentrisk@0.1.0` を公開する
4. `npm view agentrisk version` と `npx agentrisk@0.1.0 --help` を確認する
5. GitHub の `v0.1.0` tag / release を作る
6. README の npm バッジが緑/青表示になることを確認してから告知する

## 短い日本語告知文

AI コーディングエージェントにリポジトリを開かせる前に、`.mcp.json`、`AGENTS.md`、`SKILL.md`、Cursor rules、`package.json` などをゼロ実行で静的スキャンする OSS「AgentRisk」を公開しました。

GitHub URL / npm package / tarball を、MCP サーバーや install script を実行せずにプリフライトできます。

```bash
npx agentrisk scan https://github.com/owner/suspicious-agent-repo
npx agentrisk scan npm:some-mcp-server@1.2.3
```

## X / SNS 投稿案

AI エージェントに未知の repo を開かせる前に、危険な MCP 設定や指示ファイルをゼロ実行で確認する CLI「AgentRisk」を公開しました。

- GitHub / npm / tarball を事前スキャン
- MCP サーバーも package script も実行しない
- SARIF で GitHub code scanning に連携

https://github.com/Renga154/agentrisk

## ハッシュタグ

ハッシュタグは多く付けすぎず、1投稿あたり 2-4 個に絞ります。タグよりも、動くデモ、実際の finding、短いスクリーンショット、対象コミュニティへの丁寧な説明の方が重要です。

優先:

- `#AgentRisk`
- `#MCP`
- `#AIエージェント`
- `#Security`
- `#OSS`

日本語圏向け:

- `#生成AI`
- `#GitHub`
- `#セキュリティ`
- `#Claude`
- `#Cursor`

英語圏向け:

- `#AIagents`
- `#AppSec`
- `#SupplyChainSecurity`
- `#OpenSource`

## 投稿先

- GitHub release: `v0.1.0` を作り、README と同じ短い価値提案を書く
- npm: package 公開後、README が正しく表示されることを確認する
- Hacker News: `Show HN: AgentRisk, a zero-execution preflight scanner for untrusted AI-agent artifacts`
- Product Hunt: すぐ使える product として、CLI 実行例と screenshot を用意する
- Zenn: 「AIエージェント時代のサプライチェーンを、実行前にスキャンする」
- Qiita: `.mcp.json` / `AGENTS.md` / `package.json` の危険パターンと AgentRisk の使い方
- X / LinkedIn: 1つの投稿に詰め込まず、問題提起、デモ、技術解説、リリース告知に分ける
- Reddit / Discord / Slack: 宣伝文ではなく、実際に危険な MCP 設定例と検出結果を共有する

## 7日間の動き

Day 0:

- npm publish
- `v0.1.0` tag / release
- README バッジ確認
- 15-30 秒の GIF または screenshot を作る

Day 1:

- X / LinkedIn で公開
- Zenn または Qiita に技術記事を出す
- GitHub Topics と repo description を再確認する

Day 2:

- Hacker News に Show HN 投稿
- コメントで、なぜ「ゼロ実行」に寄せたのか、何を検出するのかを説明する

Day 3:

- 実際の benign / malicious corpus と検出結果を紹介する短い記事を出す
- issue template に「false positive report」「new rule request」を追加する

Day 4-5:

- Product Hunt に投稿する
- 投票依頼ではなく、実際に試した感想やフィードバックを求める

Day 6-7:

- 反応の多かったユースケースを README と docs に反映する
- 最初の community rule / fixture contribution を取り込む

## 避けること

- npm 未公開のまま `npx agentrisk` を大きく宣伝する
- ハッシュタグを大量に並べる
- 「完全に安全」と言い切る
- HN / Reddit で宣伝文だけを投げる
- Product Hunt で不自然な vote 依頼をする
