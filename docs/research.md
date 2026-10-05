# 조사: Grafana에서 TUI(터미널) 룩 대시보드를 만드는 방법 전부

조사일 2026-10-05. 각 항목은 해당 프로젝트의 문서·소스에서 직접 확인한 내용만 적었다. 별점은 레퍼런스 영상의 룩을 얼마나 그대로 낼 수 있는가(★5 = 거의 동일).

## 0. 결론 요약

1. **Grafana 12에는 선택 UI에 숨겨진 내장 테마 `matrix`가 있다.** `fontFamily: monospace`, `borderRadius: 0`, 검정/초록. URL에 `?theme=matrix`만 붙이면 전체 UI가 터미널처럼 바뀐다. 백엔드 `IsValidThemeID`가 허용하므로 preferences API로 영구 적용도 된다.
2. **코어 Canvas 패널 연결선은 11.0부터 Dashed/Dotted + 애니메이션, 12.2부터 필드값으로 방향 제어**가 된다. 플러그인 없이 "흐르는 선"이 가능.
3. 영상 룩의 요소는 전부 텍스트다. 따라서 **Business Text(또는 HTML Graphics) 패널에서 `<pre>`를 데이터로 채우는 것**이 가장 현실적인 1순위이고, 이 저장소의 `src/tuiflow.js`가 그 텍스트 생성기다.
4. 진짜 터미널이 필요하면 **Grafatui / grom**(Grafana 대시보드 JSON을 읽어 Prometheus를 터미널에 그림)을 ttyd로 서빙해 Grafana iframe에 넣거나, 아예 `cool-retro-term` 안에서 돌린다.

## 1. Grafana 패널 안에서

| 방법 | 룩 | 난이도 | 비고 |
|---|---|---|---|
| [Business Text](https://grafana.com/docs/plugins/marcusolsson-dynamictext-panel/latest/) (`marcusolsson-dynamictext-panel`) | ★5 | 중 | Handlebars로 `<pre>` 채움. Before/After JS 코드는 `new Function('context', code)`로 실행 → 최상위 `await` 불가, Promise 반환은 가능. `context.handlebars`, `context.data`(All rows: 행 배열, All data: 프레임 배열), After에 `context.element`. 외부 `<script>`는 Grafana 11에서 제거, 코드 내 `import()`만 가능. 외부 CSS URL은 됨. |
| [HTML Graphics](https://gapit-htmlgraphics-panel.gapit.io/docs/options/) (`gapit-htmlgraphics-panel`) | ★5 | 중 | HTML/SVG + CSS + `onInit`/`onRender`. v2.2.3(2025-11). |
| [Business Charts](https://grafana.com/docs/plugins/volkovlabs-echarts-panel/latest/charts-function/) (Apache ECharts) | ★4 | 중 | `lines` 시리즈 `effect.show:true` = 선 따라 점이 흐르는 효과. `graph` 시리즈 + monospace 폰트로 노드/엣지. |
| [Canvas](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/canvas/) (코어) | ★3 | 하 | 박스·텍스트·메트릭 값·연결선. 글꼴 지정 불가 → matrix 테마와 조합. 연결선 애니메이션 [#85556](https://github.com/grafana/grafana/issues/85556), 방향=필드 [What's new 2025-08](https://grafana.com/whats-new/2025-08-21-dynamic-connection-direction-in-canvas-visualizations/), 값 0에서 애니메이션 안 멈추는 버그 [#112196](https://github.com/grafana/grafana/issues/112196). |
| [Flow panel](https://grafana.com/grafana/plugins/andrewbmchugh-flow-panel/) (`andrewbmchugh-flow-panel`) | ★4 | 중 | draw.io SVG + YAML 매핑. draw.io "flow animation" 엣지(Export as SVG 필요), 속도를 데이터로 제어. 옛 FlowCharting(Angular)은 11.x에서 사실상 종료. |
| Text 패널 + iframe → 실제 TUI | ★5 | 중 | `[panels] disable_sanitize_html=true`, `[security] allow_embedding=true`. ttyd / textual-serve로 k9s·Grafatui·kutop·자작 Ratatui 서빙. https↔https 스킴 일치 필수 ([정리](https://github.com/jangaraj/grafana-iframe)). |
| [Text 패널](https://grafana.com/docs/grafana/latest/panels/visualizations/text-panel/) (Markdown/HTML/Code) | ★3 | 하 | 변수 치환만. 정적 ASCII 토폴로지 표시용. |
| 커스텀 패널 플러그인 ([@grafana/create-plugin](https://grafana.com/developers/plugin-tools/)) | ★5 | 상 | React 패널에서 xterm.js / `@beamterm/renderer` / Ratzilla WASM 직접 렌더. |
| Split Flap (dzaczek) | ★2 | 하 | 공항 플랩 디스플레이. 레트로 카운터 포인트용. |

## 2. Grafana 자체를 터미널처럼

| 방법 | 비고 |
|---|---|
| 숨은 테마 `matrix` | [matrix.json](https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/themes/themeDefinitions/matrix.json). 선택 목록([getSelectableThemes.ts](https://github.com/grafana/grafana/blob/main/public/app/core/components/ThemeSelector/getSelectableThemes.ts))에는 없지만 [index.go `getThemeForIndexData`](https://github.com/grafana/grafana/blob/main/pkg/api/index.go)가 `?theme=` 값을 `IsValidThemeID`로만 검사. v12.0.0에도 존재(`matrix.ts`). `tron`, `synthwave`, `gloom`, `mars` 등도 같은 방식. |
| 실험 테마 선택 UI | feature toggle `grafanaconThemes` / `extraThemes` ([What's new 2025-04](https://grafana.com/whats-new/2025-04-11-introducing-experimental-themes/)). |
| 전역 CSS 주입 | nginx `sub_filter '</head>' '<link rel=stylesheet href=/custom.css></head>'` ([예](https://github.com/Zidichy/GrafOrg)), Business Text 외부 CSS, 브라우저 Stylus. Grafana 팀: "CSS/DOM은 API 계약이 아니다" ([#71662](https://github.com/grafana/grafana/issues/71662)). 키오스크용. |
| CRT 오버레이 CSS | [afterglow-crt](https://github.com/HauntedCrusader/afterglow-crt)(crt-green/amber 프리셋), [ysrtv](https://github.com/Yaser-Allahim/ysrtv), [labcat-crt](https://github.com/andymai/labcat-crt), [vault66-crt-effect](https://github.com/mdombrov-33/vault66-crt-effect)(React). |
| 공식 커스텀 테마 | 2026-03 해커톤 드래프트 PR [#119725](https://github.com/grafana/grafana/pull/119725), 미병합. |

## 3. Grafana 밖, 진짜 터미널

| 도구 | 비고 |
|---|---|
| [Grafatui](https://github.com/fedexist/grafatui) (Rust) | Prometheus 직접 조회, Grafana 대시보드 JSON 임포트(timeseries/stat/gauge/bargauge/table/heatmap, 템플릿 변수), SVG/PNG 스냅샷. 2026-06 v0.1.x. |
| [grom](https://github.com/qf-studio/grom) | btop 스타일(braille, 그라데이션 미터), Grafana JSON 임포트. 2026-07 시작. |
| [sampler](https://github.com/sqshq/sampler) | YAML의 셸 명령 → runchart/sparkline/barchart/gauge/asciibox. |
| k9s `:pulses`, [kdash](https://github.com/kdash-rs/kdash), [kutop](https://github.com/ken-jo/kutop), kubetui | K8s 전용. kutop은 Textual 기반 btop 룩. |
| grafterm, ascii-grafana | 레거시(2019). |
| DIY: Ratatui/[Ratzilla](https://github.com/ratatui/ratzilla), [termdash](https://github.com/mum4k/termdash), [ntcharts](https://github.com/NimbleMarkets/ntcharts), Textual+[textual-plotext](https://github.com/textualize/textual-plotext) | termdash SegmentDisplay(16세그먼트)가 특히 레트로. Ratzilla는 같은 Rust 코드를 WASM(WebGL2)으로 브라우저에. |
| ASCII 토폴로지 | [kubectl-graph](https://github.com/steveteuber/kubectl-graph)(DOT/mermaid) → graph-easy `--as=boxart` / [D2 0.7.1+ `.txt`](https://d2lang.com/blog/ascii/) / mermaid-ascii. kube-lineage, kubectl tree는 트리. CronJob → Infinity 데이터소스 → Business Text `<pre>`. |
| [cool-retro-term](https://github.com/Swordfish90/cool-retro-term) | 진짜 CRT 셰이더. 벽걸이 최종 룩. 반대로 Grafana 렌더 PNG를 chafa로 터미널에 뿌리는 변칙도 가능. |

## 4. 조립용 라이브러리 (웹)

| 라이브러리 | 용도 |
|---|---|
| [WebTUI CSS](https://webtui.ironclad.sh/) (`@webtui/css`) | `box-="square"` 등 속성으로 TUI 테두리·타이포. catppuccin/gruvbox/nord 테마. Business Text 외부 CSS로 로드. |
| [asciichart](https://github.com/kroitor/asciichart), [chartscii](https://github.com/tool3/chartscii), `@panzi/unicode-bar-chart` | ASCII/유니코드 차트 문자열 생성. 의존성 0. |
| [xterm.js](https://github.com/xtermjs/xterm.js), [@beamterm/renderer](https://github.com/junkdog/beamterm), Ratzilla, vue-tui | 브라우저 셀 렌더러. beamterm은 PTY 없는 표시 전용 WebGL2 렌더러. |
| 글꼴 | JetBrains Mono(OFL, 저장소에 동봉), Cascadia Mono, Fira Code, IBM Plex Mono. Nerd Font 아이콘은 WebTUI plugin-nf. |

## 5. 추천 조합

- **A. Grafana 안에서 끝내기**: `?theme=matrix` + Business Text(`src/tuiflow.js` import, Handlebars 헬퍼, after-render 애니메이션) + 토폴로지는 Canvas(점선 애니메이션, 방향=필드) 또는 Business Charts(lines effect). → 이 저장소 `grafana/`.
- **B. 실제 TUI를 Grafana에 끼워 넣기**: 클러스터 안 ttyd/textual-serve 파드로 Grafatui·kutop 서빙 → Text 패널 `<iframe>`. 인증(ttyd `-c`, oauth2-proxy)·스킴 일치 주의.
- **C. Grafana 밖, 모니터를 CRT로**: cool-retro-term + grom/Grafatui(Grafana JSON 재사용) + tmux pane에 kubectl-graph → D2 `.txt` watch.

## 6. 주의

- 전역 CSS 주입과 `matrix` 테마는 비공식/실험 영역 — 업그레이드 시 깨질 수 있음.
- Canvas 요소는 글꼴 지정 불가(색·크기·정렬만).
- Business Text의 Before 코드는 async 함수가 아니므로 `await import()` 대신 `return import(...).then(...)` 패턴을 쓴다(`grafana/business-text/before.js`).
- iframe 방식은 셸 노출 범위를 최소화할 것. textual-serve는 셸을 노출하지 않음.
