# 🚀 Deployment Guide — AWS Cloud Clubs Live Location Tracker

This guide details how to deploy the entire tracking system to the public internet so it can be accessed from **anywhere in the world** by club members and administrators.

---

## 🏗️ Deployment Architecture

Because the backend server now bundles and serves:
1. The **Admin Live Map Dashboard** on `/`
2. The **Mobile Web Member App** on `/member`
3. The **REST API & Real-Time Socket.io WebSockets** on `/api` and `ws://`

**You only need to deploy ONE unified container/server to host the entire system!**

---

## ⚡ Option 1: 1-Click Free Cloud Deployment (Render.com) — *Fastest & Easiest*

Render provides free hosting with automatic HTTPS, WebSocket support, and zero maintenance.

### Steps:
1. **Push your code to GitHub**:
   ```powershell
   cd e:\Location_Tracker
   git init
   git add .
   git commit -m "Initial commit of AWS Cloud Clubs Tracker"
   # Create a repository on github.com, then:
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and sign in.
   - Click **New +** ➔ **Web Service**.
   - Select **Build and deploy from a Git repository** and connect your GitHub repo.
   - Configure:
     - **Name**: `akgec-aws-cloud-tracker`
     - **Region**: Singapore or Frankfurt (closest to India)
     - **Environment**: **Docker** (Render will automatically detect `Dockerfile`)
     - **Plan**: **Free**
   - Click **Create Web Service**.

3. **Done!**
   Render will build the Docker container and give you a public URL like:
   `https://akgec-aws-cloud-tracker.onrender.com`
   - **Admin Dashboard**: `https://akgec-aws-cloud-tracker.onrender.com`
   - **Member Mobile App**: `https://akgec-aws-cloud-tracker.onrender.com/member`

---

## ☁️ Option 2: Deploy on AWS (Recommended for AWS Cloud Clubs!)

As an official **AWS Cloud Club**, deploying on AWS provides great hands-on cloud experience.

### Method A: AWS App Runner (Containerized, Fully Managed)
AWS App Runner automatically builds, scales, and provisions SSL certificates for your container.

1. **Push your Docker image to Amazon ECR (Elastic Container Registry)**:
   ```bash
   # Log in to ECR
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

   # Create repository
   aws ecr create-repository --repository-name akgec-tracker --region ap-south-1

   # Build and push image
   docker build -t akgec-tracker .
   docker tag akgec-tracker:latest <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/akgec-tracker:latest
   docker push <AWS_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/akgec-tracker:latest
   ```

2. **Create App Runner Service**:
   - Go to the **AWS App Runner Console** in `ap-south-1` (Mumbai).
   - Choose **Container registry** ➔ **Amazon ECR** ➔ select your image.
   - Set Port to **`5000`**.
   - Click **Deploy**.
   - You get a live HTTPS endpoint: `https://xyz.ap-south-1.awsapprunner.com`.

---

### Method B: AWS EC2 / Lightsail (Free Tier / Low Cost)
1. Launch an **Ubuntu 24.04 LTS** instance (`t4g.small` or `t2.micro` on Free Tier, or AWS Lightsail $3.50/mo).
2. Allow inbound traffic on ports **`80`**, **`443`**, and **`5000`** in the Security Group.
3. SSH into the instance and run:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   cd <YOUR_REPO>
   sudo docker compose up -d --build
   ```
4. Access via your EC2 public IP or point your college domain (`tracker.akgec.ac.in`) with Certbot/Nginx for free HTTPS!

---

## 🌐 Option 3: Instant Live URL in 60 Seconds (Cloudflare Tunnel)

If you want to test the app on real phones **right now** without setting up cloud accounts:

Run this command in PowerShell:
```powershell
npx cloudflared tunnel --url http://localhost:5000
```
Cloudflare will give you an instant, secure public HTTPS URL like:
`https://random-words.trycloudflare.com`

Anyone can open that URL on their mobile phone anywhere in the world!

---

## 📱 Option 4: Build & Distribute the Flutter Member Android APK

To build a native Android `.apk` file for students to install:

```powershell
cd e:\Location_Tracker\member_app
flutter build apk --release
```

The APK will be generated at:
`member_app\build\app\outputs\flutter-apk\app-release.apk`

### Pointing the Flutter App to Your Live Public Server:
In the Flutter Member App:
1. Tap the **Settings Gear Icon** in the top-right corner of the login screen.
2. Enter your deployed server URL (e.g. `https://akgec-aws-cloud-tracker.onrender.com`).
3. Tap **Save**. All member GPS telemetry will now stream to your cloud deployment!
