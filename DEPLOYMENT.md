# 🚀 BookBridge India - Deployment Guide

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Supabase account
- Razorpay account (for payments)
- Vercel/AWS account (for hosting)

---

## Environment Variables Setup

### 1. Supabase Configuration

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### 2. Payment Gateway (Razorpay)

\`\`\`bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
\`\`\`

### 3. Maps & Location

\`\`\`bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
\`\`\`

### 4. Application Configuration

\`\`\`bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=BookBridge India
NODE_ENV=production
\`\`\`

---

## Local Development Deployment

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/aboobackerinit-hub/BooK-BridgE-IndiA.git
cd BooK-BridgE-IndiA
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Set Environment Variables

\`\`\`bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Access at: http://localhost:3000

---

## Vercel Deployment (Recommended)

### 1. Connect GitHub Repository

1. Go to https://vercel.com
2. Click "New Project"
3. Select your GitHub repository
4. Click "Import"

### 2. Configure Environment Variables

1. Go to Settings → Environment Variables
2. Add all variables from .env.example
3. Save

### 3. Deploy

\`\`\`bash
# Automatic deployment on git push
# Or deploy manually:
npm install -g vercel
vercel
\`\`\`

**Custom Domain:**
- Go to Settings → Domains
- Add your domain
- Configure DNS records

---

## AWS EC2 Deployment

### 1. Launch EC2 Instance

\`\`\`bash
# Ubuntu 22.04 LTS
# t3.medium (2GB RAM, 2 vCPU)
\`\`\`

### 2. SSH into Server

\`\`\`bash
ssh -i your-key.pem ubuntu@your-instance-ip
\`\`\`

### 3. Install Dependencies

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
\`\`\`

### 4. Clone and Setup Project

\`\`\`bash
cd /home/ubuntu
git clone https://github.com/aboobackerinit-hub/BooK-BridgE-IndiA.git
cd BooK-BridgE-IndiA

npm install
npm run build
\`\`\`

### 5. Configure Environment

\`\`\`bash
nano .env.production
# Add all environment variables
\`\`\`

### 6. Start with PM2

\`\`\`bash
pm2 start npm --name "bookbridge" -- start
pm2 save
pm2 startup
\`\`\`

### 7. Configure Nginx

\`\`\`bash
sudo nano /etc/nginx/sites-available/bookbridge
\`\`\`

Add:
\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

### 8. Enable Site and SSL

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/bookbridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
\`\`\`

---

## Docker Deployment

### 1. Create Dockerfile

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
\`\`\`

### 2. Build Image

\`\`\`bash
docker build -t bookbridge:latest .
\`\`\`

### 3. Run Container

\`\`\`bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  bookbridge:latest
\`\`\`

### 4. Docker Compose (Optional)

\`\`\`yaml
version: '3.8'

services:
  bookbridge:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    restart: unless-stopped
\`\`\`

---

## Database Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Wait for provisioning
4. Save credentials

### 2. Import Database Schema

1. Go to SQL Editor
2. Run queries from `DATABASE_SCHEMA.md`
3. Enable RLS on sensitive tables
4. Create policies

### 3. Setup Storage Buckets

\`\`\`bash
# Create buckets:
- book-images (public)
- avatars (public)
- documents (private)
\`\`\`

### 4. Setup Auth

1. Go to Authentication
2. Configure providers (Google, Email)
3. Set redirect URLs

---

## Performance Optimization

### 1. Enable Caching

- CloudFront for CDN
- Redis for session caching
- Browser caching headers

### 2. Database Optimization

- Add indexes (already in schema)
- Enable query optimization
- Setup connection pooling

### 3. Image Optimization

- WebP format conversion
- Responsive images
- Lazy loading

---

## Monitoring & Logging

### 1. Application Monitoring

\`\`\`bash
npm install sentry
\`\`\`

### 2. Error Tracking

- Sentry integration
- Error logs to database
- Real-time alerts

### 3. Analytics

- Google Analytics
- Vercel Analytics
- Custom event tracking

---

## CI/CD Pipeline

### GitHub Actions Example

\`\`\`.github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
\`\`\`

---

## SSL/TLS Certificate

### Let's Encrypt (Free)

\`\`\`bash
sudo certbot certonly --standalone -d yourdomain.com
\`\`\`

### Auto-renewal

\`\`\`bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
\`\`\`

---

## Backup & Recovery

### Database Backups

\`\`\`bash
# Weekly automated backups in Supabase
# Configure in Supabase dashboard → Settings
\`\`\`

### Code Backups

\`\`\`bash
git push origin main
\`\`\`

---

## Health Check

\`\`\`bash
# Test API endpoints
curl https://yourdomain.com/api/health

# Monitor uptime
curl -I https://yourdomain.com
\`\`\`

---

## Troubleshooting

### Port Already in Use
\`\`\`bash
lsof -i :3000
kill -9 <PID>
\`\`\`

### Build Fails
\`\`\`bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
\`\`\`

### Database Connection Issues
- Verify connection string
- Check firewall rules
- Test with psql client

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL/TLS certificate installed
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Error tracking setup
- [ ] Analytics installed
- [ ] Security headers added
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Payment gateway tested
- [ ] Email service configured
- [ ] CDN configured
- [ ] Load balancing setup
- [ ] Health checks configured

---

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Vercel dashboard: https://vercel.com
- Supabase dashboard: https://app.supabase.com
