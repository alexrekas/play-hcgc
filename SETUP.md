# Play HCGC — Setup Guide

## 1. Firebase — Enable Email/Password Auth (one click)

1. Go to https://console.firebase.google.com → your project (`play-hcgc`)
2. **Authentication** → **Get started** (if you haven't)
3. **Sign-in method** tab → click **Email/Password** → toggle **Enable** → **Save**
4. **Firestore Database** → Create database → Start in **production mode**
5. **Rules** tab → paste the contents of `firestore.rules` from this project → **Publish**

That's it. No OAuth, no Azure, no Google Cloud Console setup required.

## 2. Environment Variables

`.env.local` is already filled in with your Firebase config. If you ever need to regenerate it:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=play-hcgc.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=play-hcgc
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=play-hcgc.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=304130776582
NEXT_PUBLIC_FIREBASE_APP_ID=1:304130776582:web:...
```

## 3. Run Locally

```bash
cd hcgc-app
npm install
npm run dev
# Open http://localhost:3000
```

Create an account with any email and password (min 6 chars) and you're good to go.

## 4. Deploy to Vercel

```bash
npm install -g vercel
vercel     # follow prompts, link to your Vercel account
```

Then in the Vercel dashboard → your project → **Settings → Environment Variables** → add all the `NEXT_PUBLIC_*` values from `.env.local`.

After deploying, add your Vercel URL to Firebase:
- **Authentication → Settings → Authorized domains** → add `your-app.vercel.app`

## Project Structure

```
src/
├── app/
│   ├── page.tsx          ← Landing: email/password login + guest option
│   ├── setup/page.tsx    ← Tee selection + yardage card
│   ├── hole/[n]/page.tsx ← Hole play (aim line, shot input)
│   ├── scorecard/page.tsx← Live scorecard
│   ├── results/page.tsx  ← Post-round summary + handicap
│   └── history/page.tsx  ← All rounds + handicap index
├── components/
│   └── HoleDiagram.tsx   ← SVG hole diagram with draggable aim line
├── data/
│   └── course.ts         ← All 18 holes, all tees, course metadata
├── lib/
│   ├── firebase.ts       ← Firebase lazy init
│   ├── authContext.tsx   ← Auth state
│   ├── firestore.ts      ← Firestore read/write
│   ├── handicap.ts       ← WHS handicap calculation
│   └── shotEngine.ts     ← Shot position calculation
├── store/
│   └── gameStore.ts      ← Zustand game state (persisted to localStorage)
└── types/
    └── index.ts          ← TypeScript types
```

## Notes

- **Guest mode** still works — play without signing in, but rounds won't be saved
- Hole graphics use a programmatically-generated diagram (satellite view removed)
- WHS handicap index appears after 3 completed rounds
