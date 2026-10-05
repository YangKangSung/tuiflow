# grafana/ — Business Text 패널로 TUI 룩 만들기

가상 데이터(Grafana 내장 TestData)로 동작하는 대시보드와, 그 패널의 편집 가능한 소스.

```
grafana/
├─ docker-compose.yml            Grafana 12 + Business Text 플러그인 + 프로비저닝
├─ build-dashboard.js            business-text/* → provisioning/dashboards/tuiflow-demo.json
├─ business-text/
│  ├─ before.js                  "JavaScript code before content rendering": tuiflow import + Handlebars 헬퍼
│  ├─ content.hbs                api-gateway 박스 (All data 모드, 3개 random_walk 쿼리)
│  ├─ pods.hbs                   파드 테이블 (All rows 모드, csv_content 쿼리)
│  ├─ after.js                   "JavaScript code after content ready": 점선 위 패킷 애니메이션
│  └─ styles.css                 "Styles": 글꼴·팔레트
└─ provisioning/
   ├─ datasources/testdata.yaml  uid=testdata
   └─ dashboards/                provider + 생성된 대시보드 JSON
```

## 실행

```bash
cd grafana
docker compose up
# http://localhost:3000/d/tuiflow-demo/?theme=matrix      ← 터미널 룩 전체 UI
# http://localhost:3000/d/tuiflow-demo/?theme=matrix&kiosk ← 벽걸이용
```

Docker 없이 기존 Grafana에 붙이려면:

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
