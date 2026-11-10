#!/usr/bin/env bash
set -euo pipefail

# Ejecutar en una instancia Ubuntu nueva: sudo bash deploy/install-docker-ubuntu.sh
if [[ "${EUID}" -ne 0 ]]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi
source /etc/os-release
if [[ "${ID}" != "ubuntu" ]]; then
  echo "Este instalador requiere Ubuntu." >&2
  exit 1
fi
if command -v docker >/dev/null 2>&1; then
  docker compose version
  systemctl enable --now docker
  exit 0
fi

apt-get update
apt-get install -y ca-certificates curl openssl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker compose version
