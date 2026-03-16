# Run The Project

This project contains two parts:

- a mobile app built with Expo
- a backend API built with Express

## 1. Open the project

Go to the project root:

```bash
cd "/Users/dogan/Desktop/fridgechef-ai"
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env` file in the project root and add:

```env
OPENAI_API_KEY=your_openai_api_key
PEXELS_API_KEY=your_pexels_api_key
```

Optional:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api/v1
```

Use `EXPO_PUBLIC_API_URL` only if your phone cannot reach the backend automatically.

## 4. Start the backend

Run this in the first terminal:

```bash
npm run backend:start
```

The backend runs on:

```text
http://127.0.0.1:3000/api/v1
```

Health check:

```text
http://127.0.0.1:3000/api/v1/health
```

## 5. Start the mobile app

Run this in a second terminal:

```bash
npx expo start --ios
```

If you want to use Expo tunnel:

```bash
npm run start:tunnel
```

You can also run:

```bash
npx expo start --android
```

or:

```bash
npx expo start --web
```

## 6. Quick notes

- If `OPENAI_API_KEY` is missing, AI analysis features will not work correctly.
- For real device testing, keeping the phone and computer on the same network is recommended.
- If the app shows old UI changes, restart Expo with a clean cache:

```bash
npx expo start --clear
```

## 7. Verification

Useful checks:

```bash
npm run typecheck
npm test
```
