This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
npm run dev -- -p 8079
# or
npm run dev -- --experimental-https -p 7089
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Running with Docker

This project includes a Docker setup for production deployment.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

1. Create a `.env` file with your environment variables (see `.env.example` if available).
2. Build and start the container:

```bash
docker-compose up --build
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Manual Build

To build the image manually:

```bash
docker build -t nextjs-docker .
```

To run the image manually:

```bash
docker run -p 3000:3000 nextjs-docker
```
PROJECT_NAME=LORALOCAL
API_URL=http://192.167.5.46:8012
GROUP_CODE_ALL_PROJECT=oPIvy3ef9VIT
# Sidebar
SIDEBAR_LOGO=/logo-le-full.svg
APP_ICON=/logo-le.svg
DEFAULT_LOCALE=th
DEFAULT_THEME=skyblue
WAIT_TIME=30
BASE_FONT_SIZE=16
FONT_FAMILY=Kanit

# Map Configuration
MAP_MODE=offline
MAP_OFFLINE_URL=http://192.167.5.46:8080/data/maptaphut/{z}/{x}/{y}.png
MAP_GPS_TYPE=rtu
MAP_KM=9
MAP_ROTATION=0
GOOGLE_MAPS_KEY=
MAP_DEFAULT_ZOOM=17
MAP_DEFAULT_LAT=12.69527924160
MAP_DEFAULT_LNG=101.13525382963
MAP_ICON_SCALE=0.4

# Project Settings
USING_HTTPS=true

VERSION_LIGHT_SENSOR=1
START_DATE_PROJECT=2024-01-01
ALLOWED_ORIGINS=localhost
IMAGE_PROTOCOL=http
IMAGE_HOSTNAME=192.167.5.46
IMAGE_PORT=8012

# Alert Settings Configuration (Hide)
HIDDEN_CONFIG_ALERTS=batt,timeControlAllSystem