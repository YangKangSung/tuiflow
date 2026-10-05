# tuiflow

**터미널(TUI) 룩의 애니메이션 다이어그램·차트를 웹에서 — Grafana 대시보드, VS Code 확장, 프레젠테이션용.**

점선 박스 노드, 그 사이를 흐르는 `.o@` 패킷, `█▓░` 막대, `▁▂▃▅▇` 스파크라인, 세션 로그, tmux 풍 상태줄.
모든 요소를 **문자열**로 만들고 색만 `<span>`으로 입힌다. 그래서 같은 코드가 브라우저·Grafana 패널·VS Code 웹뷰·슬라이드에서 그대로 돈다.

레퍼런스 룩: [X 영상 (eng_khairallah1)](https://x.com/eng_khairallah1/status/2106852012558266388/video/1) → 요소 분해는 [docs/look-spec.md](docs/look-spec.md).

## 지금 들어 있는 것 (v0.4)

| 경로 | 내용 |
|---|---|
| [`src/tuiflow.js`](src/tuiflow.js) | 코어. 의존성 0, UMD. `bar` `sparkline` `meter` `box` `edge` `vedge` `table` `statusBar` `braillePlot`/`lineChart`/`flame`/`geoPlot` `Screen` `animate` |
| [`demo/index.html`](demo/index.html) | 단독 데모(가짜 K8s 클러스터, 100×36 셀). 팔레트 3종(video/matrix/amber), CRT 오버레이, 전체화면, 프레임을 텍스트로 복사. 글꼴 동봉이라 오프라인 PC에서도 동작 |
| [`grafana/`](grafana/) | Business Text 패널 소스 + TestData 대시보드 3종(demo / library / before-after) + WSL Docker 기동 스크립트. 사내 TLS 프록시·오프라인에서도 돌도록 플러그인은 호스트에서 받아 마운트 |
| [`grafana/library/`](grafana/library/) | **공식 Grafana visualization 25종 + Flow/Columns** 을 같은 TUI 톤으로. 쿼리 무관 — 숫자 필드를 시리즈로 삼고 Grafana 필드 설정을 그대로 적용. `npm run publish:library` → *Import from library* → 쿼리만 교체 |
| [`grafana/catalog.js`](grafana/catalog.js) | [공식 시각화 목록](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) 1:1 카탈로그 |
| [`docs/research.md`](docs/research.md) | Grafana에서 TUI 룩을 내는 방법 전수 조사 (숨은 `matrix` 테마, Canvas 애니메이션 연결선, 플러그인, 터미널 도구, 라이브러리) |
| [`docs/look-spec.md`](docs/look-spec.md) | 룩 정의서 — 글리프 어휘, 팔레트, 레이아웃·애니메이션 규칙, 타깃별 매핑 |
| [`test/`](test/) | 코어 단위 테스트 + Business Text 템플릿을 플러그인과 같은 방식으로 렌더해 폭/헬퍼/정리 함수 검증 |

## 빠른 시작

```bash
# 1) 데모 (아무 정적 서버. 더블클릭 file:// 로도 열림)
npm run serve            # python -m http.server 8787
# → http://localhost:8787/demo/index.html   키: Space 일시정지 · T 테마 · C CRT · F 전체화면

# 2) Grafana — Windows + WSL Docker Engine (Docker Desktop 불필요)
.\grafana\fetch-plugins.ps1    # 최초 1회
.\grafana\up.ps1               # → http://localhost:3000/d/tuiflow-demo/?theme=matrix  (admin/admin)
#    Linux/macOS: bash grafana/fetch-plugins.sh && (cd grafana && docker compose up -d)

# 3) 라이브러리 패널 등록 (기존 차트를 TUI로 바꿔 쓰기)
npm run publish:library        # → http://localhost:3000/d/tuiflow-library/?theme=matrix
#    다른 Grafana: GRAFANA_URL=https://… GRAFANA_TOKEN=glsa_… npm run publish:library

# 4) 테스트 / JSON 재생성
npm install && npm test
npm run build                  # dashboards + library
```

## 코어 사용 예

```html
<script src="src/tuiflow.js"></script>
<pre id="out"></pre>
<script>
  const tf = tuiflow;
  const s = new tf.Screen(60, 7);
  s.putLines(0, 0, tf.box([
    "rps  " + tf.bar(0.62, 10) + "  812",
    "cpu  " + tf.sparkline([3, 5, 9, 4, 7, 8, 6, 2], { min: 0, max: 10 }),
  ], { title: "api-gateway", width: 30, style: "dashed" }), "c-border");
  tf.animate((tick) => {
    s.put(31, 1, tf.edge(10, tick, { speed: 1.2 }), "c-packet");
    s.render(document.getElementById("out"));
  }, 8);
</script>
```

Grafana에서는 같은 함수를 Handlebars 헬퍼로 감싼다 → [`grafana/business-text/before.js`](grafana/business-text/before.js).

## 로드맵

- [x] 0.1 — 조사 정리, 코어 프리미티브, 단독 데모, Business Text 레시피 + TestData 대시보드
- [x] 0.2 — 브라유 라인 차트(`lineChart`), 쿼리 무관 generic 헬퍼 5종, 라이브러리 패널 6종 + API 등록 스크립트, WSL Docker 기동 스크립트
- [x] 0.3 — 브라유 라인/파이/스캐터, generic 헬퍼, 라이브러리 패널 + before/after 대시보드
- [x] 0.4 — 공식 Grafana visualization 25종을 같은 TUI 톤으로 (Flame / Canvas / Geomap / Annotations / Text / News 포함)
- [ ] 0.5 — 프레젠테이션: 슬라이드 모드(장면 전환, 타이핑 효과, 스크립트된 이벤트), 녹화용 결정적 시드, PNG/SVG 내보내기
- [ ] 0.6 — VS Code 확장: Webview 패널에 `tuiflow.js` + `--vscode-*` 테마 토큰 매핑, 워크스페이스 JSON 장면 파일 미리보기
- [ ] 0.7 — 커스텀 패널 플러그인 `tuiflow-panel`: Visualization 피커에 TUI Time series/Stat/…, 패널 크기 자동 맞춤, 옵션 UI(글리프·팔레트·패킷 속도)
- [ ] 1.0 — 실제 클러스터 연결(Prometheus HTTP API 직접 호출 모드), 설정 스키마, 문서 사이트

## 라이선스

미정(private). 동봉 글꼴 JetBrains Mono는 [SIL OFL 1.1](demo/fonts/OFL.txt).
