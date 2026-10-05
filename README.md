# tuiflow

**터미널(TUI) 룩의 애니메이션 다이어그램·차트를 웹에서 — Grafana 대시보드, VS Code 확장, 프레젠테이션용.**

점선 박스 노드, 그 사이를 흐르는 `.o@` 패킷, `█▓░` 막대, `▁▂▃▅▇` 스파크라인, 세션 로그, tmux 풍 상태줄.
모든 요소를 **문자열**로 만들고 색만 `<span>`으로 입힌다. 그래서 같은 코드가 브라우저·Grafana 패널·VS Code 웹뷰·슬라이드에서 그대로 돈다.

레퍼런스 룩: [X 영상 (eng_khairallah1)](https://x.com/eng_khairallah1/status/2106852012558266388/video/1) → 요소 분해는 [docs/look-spec.md](docs/look-spec.md).

## 지금 들어 있는 것 (v0.1)

| 경로 | 내용 |
|---|---|
| [`src/tuiflow.js`](src/tuiflow.js) | 코어. 의존성 0, UMD. `bar` `sparkline` `meter` `box` `edge` `vedge` `table` `statusBar` `Screen`(셀 그리드 → text/HTML) `animate` |
| [`demo/index.html`](demo/index.html) | 단독 데모(가짜 K8s 클러스터, 100×36 셀). 팔레트 3종(video/matrix/amber), CRT 오버레이, 전체화면, 프레임을 텍스트로 복사. 글꼴 동봉이라 오프라인 PC에서도 동작 |
| [`grafana/`](grafana/) | Business Text 패널 소스(`before.js`/`content.hbs`/`pods.hbs`/`after.js`/`styles.css`) + TestData 기반 대시보드 JSON + WSL Docker 기동 스크립트. 사내 TLS 프록시·오프라인에서도 돌도록 플러그인은 호스트에서 받아 마운트 |
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

# 3) 테스트 / 대시보드 JSON 재생성
npm install && npm test
npm run build:dashboard
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
- [ ] 0.2 — 코어: 꺾이는 연결선(`┐└┘` 라우팅), 세로 막대, 게이지, 상태 태그 헬퍼, `Scene` 선언형 레이아웃(JSON → Screen)
- [ ] 0.3 — Grafana: Prometheus 쿼리 예제(kube-state-metrics), Canvas 패널 연결선 애니메이션 예제 JSON, `?theme=matrix` 키오스크 가이드
- [ ] 0.4 — 프레젠테이션: 슬라이드 모드(장면 전환, 타이핑 효과, 스크립트된 이벤트), 녹화용 결정적 시드, PNG/SVG 내보내기
- [ ] 0.5 — VS Code 확장: Webview 패널에 `tuiflow.js` + `--vscode-*` 테마 토큰 매핑, 워크스페이스 JSON 장면 파일 미리보기
- [ ] 1.0 — 실제 클러스터 연결(Prometheus HTTP API 직접 호출 모드), 설정 스키마, 문서 사이트

## 라이선스

미정(private). 동봉 글꼴 JetBrains Mono는 [SIL OFL 1.1](demo/fonts/OFL.txt).
