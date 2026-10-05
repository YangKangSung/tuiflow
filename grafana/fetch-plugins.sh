#!/usr/bin/env bash
# Download the Grafana plugins this dashboard needs into grafana/plugins/ so
# the container never has to reach grafana.com itself.
#
# Why not GF_INSTALL_PLUGINS? Behind a TLS-inspecting corporate proxy the
# container (alpine, stock CA bundle) fails with "x509: certificate signed by
# unknown authority" and Grafana exits. The host (WSL/Windows) already trusts
# the proxy CA, so download here and bind-mount the result. This also makes
# the stack work on an air-gapped machine: copy grafana/plugins/ along.
#
#   bash grafana/fetch-plugins.sh            # 6.1.0 — last line that loads on Grafana 12.2
#   bash grafana/fetch-plugins.sh 6.3.0      # pin a version
# 6.3.0 declares grafanaDependency >=12.3.0; Grafana 12.2 then disables the plugin.
#
# On Windows use fetch-plugins.ps1 instead (some proxies reset curl from WSL
# while the Windows HTTP stack goes through).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="$here/plugins"
version="${1:-6.1.0}"
plugins=(marcusolsson-dynamictext-panel)
github_fallback_tag="v6.1.0"

mkdir -p "$dest"
for id in "${plugins[@]}"; do
  tmp="$(mktemp)"
  echo "fetching ${id}@${version}"
  if ! curl -fsSL "https://grafana.com/api/plugins/${id}/versions/${version}/download" -o "$tmp"; then
    echo "  grafana.com failed, trying GitHub release ${github_fallback_tag}"
    curl -fsSL "https://github.com/VolkovLabs/business-text/releases/download/${github_fallback_tag}/${id}-${github_fallback_tag#v}.zip" -o "$tmp"
  fi
  rm -rf "${dest:?}/${id}"
  if command -v unzip >/dev/null; then
    unzip -q -o "$tmp" -d "$dest"
  else
    python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$tmp" "$dest"
  fi
  rm -f "$tmp"
  printf '  -> %s (%s)\n' "${dest}/${id}" "$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['info']['version'])" "${dest}/${id}/plugin.json" 2>/dev/null || echo 'version unknown')"
done
