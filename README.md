# Monument Capture

Monument Capture is a mobile game where players discover nearby monuments, submit photo evidence to capture them, and track ownership. Moderators review submissions, while coordinators manage monument records.

This repository contains the Sprint 3 starter architecture:

- `mobile/` — Expo + React Native + TypeScript frontend
- `backend/` — Spring Boot REST API

## Branches

- `prod` — production-ready releases
- `prestaging` — release validation before production
- `playground` — experiments that should not affect release branches
- `dev_jason_inital_setup` — initial Sprint 3 scaffolding and setup work

No branches are merged as part of this initial setup.

## Prerequisites

- Node.js 20 or newer and npm
- Expo Go or an Android/iOS emulator
- Java 17 or newer
- Maven 3.9 or newer

## Run the mobile app

```bash
cd mobile
npm install
npm start
```

Copy `mobile/.env.example` to `mobile/.env` when a custom API URL is needed. The default example points to a local backend and contains no secrets.

## Run the backend

```bash
cd backend
mvn spring-boot:run
```

The starter health endpoint is available at `GET http://localhost:8080/api/health`.

## Verify the projects

```bash
cd mobile
npm run typecheck

cd ../backend
mvn test
```

## Configuration and secrets

- Never commit `.env` files, API keys, signing files, database credentials, or generated build output.
- Commit only safe examples such as `.env.example`.
- Provide production configuration through the deployment environment or an approved secret manager.

## Current starter screens

- Home dashboard
- Monument discovery list
- Photo capture instructions
- Player profile and activity summary

The sample monument data is intentionally local and can be replaced with backend calls in a later sprint.
