#!/bin/bash
# Script de setup initial sur Oracle Free Tier (Oracle Linux / RHEL)

set -e
REPO_URL="https://github.com/leopoldfc/lol-rating"
APP_DIR="/home/opc/lol-ranking"
WEB_DIR="/var/www/lol-ranking"
USER="opc"

echo "=== 1. Installation des dépendances système ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs git nginx

echo "=== 2. Firewall ==="
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

echo "=== 3. Clone du repo ==="
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "=== 4. Installation des dépendances Node ==="
npm install
cd frontend && npm install && cd ..

echo "=== 5. Premier scrape + build ==="
npm run scrape:2026
npm run news
cd frontend && npm run build && cd ..

echo "=== 6. Déploiement des fichiers statiques ==="
sudo mkdir -p "$WEB_DIR"
sudo cp -r frontend/dist/* "$WEB_DIR/"
sudo chown -R "$USER:$USER" "$WEB_DIR"

echo "=== 7. Configuration Nginx ==="
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sudo cp scripts/nginx-lol-ranking.conf /etc/nginx/sites-available/lol-ranking
sudo ln -sf /etc/nginx/sites-available/lol-ranking /etc/nginx/sites-enabled/lol-ranking

# Inclure sites-enabled dans nginx.conf si pas déjà présent
if ! sudo grep -q "sites-enabled" /etc/nginx/nginx.conf; then
    sudo sed -i '/^http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "=== 8. Permissions sudo sans mot de passe pour le déploiement ==="
echo "opc ALL=(ALL) NOPASSWD: /bin/cp, /usr/bin/cp" | sudo tee /etc/sudoers.d/lol-ranking
sudo chmod 440 /etc/sudoers.d/lol-ranking

echo "=== 9. Cron quotidien à 4h UTC ==="
chmod +x "$APP_DIR/scripts/daily-update.sh"
(crontab -l 2>/dev/null; echo "0 4 * * * $APP_DIR/scripts/daily-update.sh >> /home/opc/scrape.log 2>&1") | crontab -

echo ""
echo "=== Setup terminé ! ==="
echo "Ton app est disponible sur http://145.241.172.158"
echo "Logs : tail -f /home/opc/scrape.log"
