# grafana/ — Business Text 패널로 TUI 룩 만들기

가상 데이터(Grafana 내장 TestData)로 동작하는 대시보드와, 그 패널의 편집 가능한 소스.

```
grafana/
├─ docker-compose.yml            Grafana 12 + 프로비저닝 + ./plugins, ../src/tuiflow.js 마운트
├─ up.ps1                        Windows: WSL Docker Engine으로 기동/정지 (+ WSL keep-alive)
├─ fetch-plugins.ps1 / .sh       Business Text 플러그인을 호스트에서 ./plugins 로 다운로드
├─ build-dashboard.js            business-text/* → provisioning/dashboards/*.json (demo, library)
├─ build-library.js              business-text/* → library/*.json (라이브러리 패널 6종)
├─ publish-library.js            library/*.json → Grafana /api/library-elements 에 upsert
├─ business-text/
│  ├─ before.js                  Handlebars 헬퍼: 필드용(tfBar…) + 쿼리 무관 generic(tfTimeseries…)
│  ├─ content.hbs                api-gateway 박스 (All data 모드, 3개 random_walk 쿼리)
│  ├─ pods.hbs                   파드 테이블 (All rows 모드, csv_content 쿼리)
│  ├─ after.js                   "JavaScript code after content ready": 점선 위 패킷 애니메이션
│  └─ styles.css                 "Styles": 글꼴·팔레트·시리즈 색(tf-s0..5)
├─ library/                      생성된 라이브러리 패널 JSON (tuiflow-timeseries, -stat, -bargauge, -gauge, -table, -flow)
└─ provisioning/
   ├─ datasources/testdata.yaml  uid=testdata
   └─ dashboards/                provider + tuiflow-demo.json + tuiflow-library.json
```

## 라이브러리 패널 — 어떤 쿼리든 TUI로

`{{{tfTimeseries}}}` `{{{tfStat}}}` `{{{tfBarGauge}}}` `{{{tfGauge}}}` `{{{tfTable}}}` 헬퍼는 필드 이름을 전혀 보지 않는다.
`context.panelData.series`의 **숫자 필드 전부를 시리즈로** 삼고, Grafana 필드 설정(unit·decimals·min/max·thresholds·displayName·override)을 `field.display()`로 그대로 적용한다.
그래서 쿼리만 바꾸면 기존 Time series / Stat / Bar gauge / Gauge / Table 패널이 TUI 룩이 된다.

```bash
npm run build              # library/*.json + provisioning/dashboards/*.json 재생성
npm run publish:library    # 로컬 Grafana(admin/admin)에 6개 upsert
# 다른 Grafana: GRAFANA_URL=https://… GRAFANA_TOKEN=glsa_… npm run publish:library
```

| 라이브러리 패널 | 대응 코어 패널 | Content |
|---|---|---|
| TUI Time series | Time series | `<pre class="tf">{{{tfTimeseries 90 14}}}</pre>` — 브라유(⣿) 라인 차트, y축 단위, 범례 |
| TUI Stat | Stat | `{{{tfStat 28}}}` — 시리즈별 이름·스파크라인·값(임계값 색) |
| TUI Bar gauge | Bar gauge | `{{{tfBarGauge 32}}}` — min/max 기준 블록 막대 |
| TUI Gauge | Gauge | `{{{tfGauge 20}}}` — `[████░░] 62%` |
| TUI Table | Table | `{{{tfTable 40}}}` — 첫 프레임을 표로, 숫자는 display 포맷 |
| TUI Flow | (Canvas 대체) | `content.hbs` — 필드명 `rps`/`p95_ms`/`err_pct` 고정 |

사용법 두 가지:

1. 아무 대시보드에서 *Add → Import from library → TUI …* → (원하면 *Unlink*) → TestData 쿼리를 내 쿼리로 교체.
2. 기존 패널을 그 자리에서 바꾸기: Visualization을 *Business Text*로 → Content에 `{{{tfTimeseries 90 14}}}` 한 줄 → "JavaScript code before content rendering"과 "Styles"에 `before.js`/`styles.css`를 붙여넣기. 쿼리·변수·시간범위는 그대로.

괄호 안 숫자는 셀 단위 폭/높이다(패널 크기에 맞춰 조절). 자동 맞춤은 커스텀 패널 플러그인(로드맵)에서.
라이브러리 패널은 Grafana가 파일 프로비저닝을 지원하지 않아 API로 넣는다(`publish-library.js`: 없으면 POST, 있으면 version 붙여 PATCH). `tuiflow-library` 대시보드는 uid 참조만 들고 있으므로 `publish:library` 뒤에 열어야 한다.

`before.js`의 `import("/public/tuiflow.js?v=<package.json version>")` — 버전 쿼리는 빌드가 넣는다. 코어를 고치고 캐시가 남으면 `package.json` 버전을 올리고 `npm run build && npm run publish:library`.

## 실행

### Windows + WSL Docker Engine (Docker Desktop 없음) — 이 저장소의 기본 개발 환경

```powershell
.\grafana\fetch-plugins.ps1   # 최초 1회: Business Text 플러그인을 grafana/plugins/ 에 내려받음
.\grafana\up.ps1              # dockerd 기동 → compose up -d → WSL keep-alive → 헬스 대기
# http://localhost:3000/d/tuiflow-demo/?theme=matrix       ← 터미널 룩 전체 UI (편집: admin / admin)
# http://localhost:3000/d/tuiflow-demo/?theme=matrix&kiosk ← 벽걸이용 (익명 Viewer)
.\grafana\up.ps1 -Down        # 정지
```

전제: WSL 배포판(`Ubuntu-24.04`)에 Docker Engine 설치 — `curl -fsSL https://get.docker.com | sudo sh`.
다른 배포판이면 `-Distro` 인자로 지정.

### Linux / macOS

```bash
bash grafana/fetch-plugins.sh
cd grafana && docker compose up -d
```

### 이 환경에서 실제로 부딪힌 두 가지

1. **사내 TLS 검사 프록시** — 컨테이너(alpine, 기본 CA 번들)는 `grafana.com`을 `x509: certificate signed by unknown authority`로 거부해 `GF_INSTALL_PLUGINS`가 실패하고 Grafana가 바로 종료된다. 그래서 플러그인은 호스트(프록시 CA를 신뢰함)에서 내려받아 `./plugins`를 바인드 마운트하고, `GF_PLUGINS_PREINSTALL_DISABLED`·`GF_PLUGINS_PUBLIC_KEY_RETRIEVAL_DISABLED`·업데이트 체크 끔으로 컨테이너의 외부 호출을 없앴다. 부수 효과로 오프라인 PC에서도 그대로 돈다(`grafana/plugins/`만 같이 복사).
2. **WSL VM 유휴 종료** — 마지막 `wsl.exe` 세션이 끝나고 약 1분 뒤 VM이 내려가면서 dockerd와 컨테이너가 SIGTERM을 받는다(증상: 조금 전까지 되던 `:3000`이 `ERR_CONNECTION_REFUSED`). `up.ps1`이 숨김 `wsl --exec sleep infinity` 세션을 띄워 VM을 붙잡고, compose에 `restart: unless-stopped`를 둬 dockerd가 다시 뜨면 컨테이너도 따라온다.

### Docker 없이 기존 Grafana에 붙이려면

1. `marcusolsson-dynamictext-panel` 설치 (Business Text 6.x, Grafana 11+).
2. `src/tuiflow.js`를 Grafana의 `public/` 폴더에 복사 → `/public/tuiflow.js`로 서빙됨 (`before.js`가 `import()` 함).
3. `provisioning/dashboards/tuiflow-demo.json`을 Import. 데이터소스는 TestData(uid `testdata`)를 가리키므로 Import 화면에서 바꿔 주거나, 쿼리를 Prometheus로 교체.

## Prometheus로 바꾸기

템플릿은 행 객체의 키 이름만 본다. 쿼리의 legend/alias를 아래처럼 맞추면 그대로 동작한다.

| 키 | 의미 | PromQL 예 |
|---|---|---|
| `rps` | 초당 요청 | `sum(rate(nginx_ingress_controller_requests[1m]))` |
| `p95_ms` | p95 지연(ms) | `histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m]))) * 1000` |
| `err_pct` | 5xx 비율(%) | `100 * sum(rate(...{status=~"5.."}[5m])) / sum(rate(...[5m]))` |

Business Text에서 Prometheus 결과의 값 필드 이름은 legend format이 된다 (`Legend: rps`). 파드 테이블은 `kube_pod_status_phase`·`kube_pod_container_status_restarts_total` 같은 kube-state-metrics 인스턴트 쿼리를 Table 변환으로 합치거나, Infinity 데이터소스로 K8s API를 읽어 CSV와 같은 열(`pod,ready,restarts,cpu_m,mem_mi,status`)로 만들면 된다.

## 소스를 고친 뒤

```bash
node grafana/build-dashboard.js   # JSON 재생성
npm test                          # 템플릿 폭·헬퍼 등록·after.js 정리 함수 검증 (handlebars devDependency)
```

## 패널 코드가 실행되는 방식 (플러그인 소스 기준)

- Before/After 코드는 `new Function('context', code)`로 실행된다 → 최상위 `await` 불가. `before.js`는 `return import(...).then(...)`으로 Promise를 돌려주고, 패널은 그것을 await한 뒤 템플릿을 컴파일한다.
- All rows 모드: 템플릿 루트 `{ data: rows }`, After의 `context.data`는 rows 배열. All data 모드: `data`는 프레임(행 배열)의 배열.
- After 코드의 반환값이 함수면 다음 렌더 전에 cleanup으로 호출된다 → `tf.animate()`가 돌려주는 stop 함수를 그대로 반환하면 타이머가 새지 않는다.
- HTML은 `disable_sanitize_html`이 꺼져 있어도 `<pre>`, `<span class>`는 살아남는다. iframe을 넣을 때만 켠다.
