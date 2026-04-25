#!/bin/bash
set -e

LOG_FILE="/home/opc/scrape.log"
APP_DIR="/home/opc/lol-ranking"
WEB_DIR="/var/www/lol-ranking"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Daily update started ==="

cd "$APP_DIR"

log "Pulling latest changes..."
git pull origin main

log "Scraping leagues 2026..."
npm run scrape:2026

log "Scraping news..."
npm run news

log "Building frontend..."
cd frontend
npm run build

log "Deploying to nginx..."
sudo cp -r dist/* "$WEB_DIR/"

cd ..

log "=== Daily update done ==="
