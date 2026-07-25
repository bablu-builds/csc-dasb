# Setup Guide — AZAAN COMMUNICATION TOUR AND TRAVEL

## Step 1: Create a Free Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → enter a project name (e.g. `azaan-csc`) → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Enable Firebase Authentication
1. In your project, go to **Build → Authentication → Get started**
2. Click **Email/Password** → Enable it → Save

### Enable Firestore Database
1. Go to **Build → Firestore Database → Create database**
2. Choose **"Start in production mode"** → Select a location close to India (e.g. `asia-south1`) → Enable

### Set Firestore Security Rules
In Firestore, click **Rules** and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
Click **Publish**.

## Step 2: Get Your Firebase Config Keys

1. In Firebase Console, go to **Project Settings** (gear icon ⚙️ top-left)
2. Scroll down to **"Your apps"** → Click **Web** (</> icon) → Register app
3. Copy the `firebaseConfig` object — you'll need these 6 values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Step 3: Add Keys to Replit Secrets

In Replit, click the **lock icon 🔒** (Secrets) in the left sidebar and add:

| Secret Name | Value (from Firebase config) |
|---|---|
| `VITE_FIREBASE_API_KEY` | your `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | your `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | your `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | your `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | your `appId` |

After adding all 6, restart the app.

## Step 4: Create Your First Login Account

Once Firebase is connected, use the **Register** link on the login page to create an account with your email and password. After that, you (or your staff) can log in.

---

## Deploy FREE to GitHub Pages

1. Push this project to a new GitHub repository
2. In GitHub repo → **Settings → Pages** → Source: **GitHub Actions**
3. Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm --filter @workspace/azaan-csc run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./artifacts/azaan-csc/dist/public
```
4. Add the same 6 Firebase secrets in GitHub → **Settings → Secrets → Actions**
5. Push to `main` — GitHub Actions will auto-deploy at `https://<username>.github.io/<repo>/`
