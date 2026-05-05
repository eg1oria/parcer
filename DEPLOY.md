# Deploy nataliagorlach.kz

This project is ready to run as:

- host Nginx + Let's Encrypt TLS
- Docker Compose: PostgreSQL, NestJS backend, Next.js frontend

## 1. DNS

Point these records to `212.19.134.34`:

```text
nataliagorlach.kz      A  212.19.134.34
www.nataliagorlach.kz  A  212.19.134.34
```

Wait until the records resolve before issuing the certificate.

## 2. Install Server Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git nginx ufw openssl snapd

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx

sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 3. Upload Project And Configure Env

```bash
cd /opt
sudo git clone <your-repo-url> nataliagorlach
sudo chown -R "$USER":"$USER" /opt/nataliagorlach
cd /opt/nataliagorlach

cp .env.example .env
nano .env
```

Generate strong secrets:

```bash
openssl rand -base64 32
```

Set at least `POSTGRES_PASSWORD` and `JWT_SECRET` in `.env`.

## 4. Start App Containers

```bash
docker compose up -d --build
docker compose ps
```

Backend will run migrations automatically on container start.

## 5. Issue HTTPS Certificate

Use the bootstrap config for the first certificate request:

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/bootstrap.conf /etc/nginx/sites-available/nataliagorlach.kz
sudo ln -sf /etc/nginx/sites-available/nataliagorlach.kz /etc/nginx/sites-enabled/nataliagorlach.kz
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

sudo certbot certonly --webroot -w /var/www/certbot -d nataliagorlach.kz -d www.nataliagorlach.kz
```

Then switch to the final HTTPS config:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/nataliagorlach.kz
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Useful Commands

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose pull
docker compose up -d --build
sudo certbot renew --dry-run
```
