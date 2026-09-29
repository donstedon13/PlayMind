# PlayMind PB Score — Mobile App (Expo / React Native)

Πραγματικό mobile app για Android & iOS. Τρέχει στο κινητό σου μέσα σε λίγα λεπτά
με το Expo Go, χωρίς να χρειάζεσαι developer λογαριασμούς στην αρχή.

## Τι αλλάζει σε σχέση με τη web έκδοση

| | Web | Mobile (αυτό) |
|---|---|---|
| Φωτογραφία δελτίου | Μόνο upload αρχείου | **Πραγματική κάμερα** + gallery |
| Share badge | Κείμενο μόνο | **Πραγματική εικόνα 9:16 PNG** → Instagram/TikTok/WhatsApp |
| Navigation | Κουμπιά με state | Native bottom tabs |
| Session | Χάνεται στο refresh | Παραμένει (AsyncStorage) |
| QR code | Placeholder κουτί | Πραγματικό, σκαναρίσιμο QR |

---

## ΒΗΜΑ 1 — Προαπαιτούμενα

```bash
node --version    # πρέπει v20+ (προτείνεται v22)
```

Στο **κινητό σου**: εγκατάστησε το **Expo Go** από το Play Store / App Store.

⚠️ Το Expo Go των stores υποστηρίζει **μία μόνο έκδοση SDK τη φορά** (τελευταία
πληροφορία που βρήκα: SDK 54, Μάιος–Ιούνιος 2026). Το project είναι στημένο
για SDK 54. Έλεγξε στο https://expo.dev/go ποια SDK υποστηρίζει το Expo Go σου —
αν είναι διαφορετική, θα δεις "Project is incompatible with this version of Expo Go".

---

## ΒΗΜΑ 2 — Εγκατάσταση

```bash
npm install
npx expo install --fix     # ευθυγραμμίζει τις εκδόσεις των πακέτων με το SDK
npx expo-doctor            # αναφέρει ό,τι δεν ταιριάζει
```

Οι εκδόσεις στο `package.json` είναι βάσει SDK 54 αλλά **δεν έχουν δοκιμαστεί εδώ**
(δεν έχω πρόσβαση σε Expo/δίκτυο) — γι' αυτό το `expo install --fix`.

---

## ΒΗΜΑ 3 — Firebase setup

Αν **δεν** το έχεις ήδη κάνει από τη web έκδοση, ακολούθησε τα ίδια βήματα:

1. console.firebase.google.com → Add project
2. Ενεργοποίησε: **Authentication** (Anonymous), **Firestore**, **Storage**
3. Αναβάθμισε σε **Blaze plan** (υποχρεωτικό για Cloud Functions)
4. Project settings → Your apps → Web app (`</>`) → αντίγραψε το config

Αν το έχεις ήδη κάνει, χρησιμοποίησε **το ίδιο project** — τα δεδομένα θα είναι κοινά.

---

## ΒΗΜΑ 4 — Βάλε το config

Άνοιξε `src/firebase.js` και αντικατέστησε τα `YOUR_...` με τις πραγματικές τιμές.

---

## ΒΗΜΑ 5 — Ενεργοποίησε Firebase AI Logic (αντί για OpenAI key)

Το OCR δεν χρειάζεται πια δικό σου OpenAI account. Χρησιμοποιεί το Gemini
μέσω Firebase AI Logic — καμία διαχείριση API key στον κώδικα.

1. Firebase console → αριστερό μενού **Build** → **AI Logic**
2. **Get started** → διάλεξε **Gemini Developer API** (το πιο απλό backend για αρχή)
3. Ακολούθησε τον wizard — ενεργοποιεί μόνο του τα απαραίτητα APIs στο project σου
4. Τέλος. Δεν χρειάζεται `firebase functions:secrets:set` για κανένα AI key πια.

Η χρέωση πάει στο δικό σου Firebase/GCP billing (Blaze plan, επόμενο βήμα) —
όχι σε ξεχωριστό OpenAI λογαριασμό.

---

## ΒΗΜΑ 6 — Blaze plan + deploy backend

```bash
firebase login
firebase use --add          # διάλεξε το project σου
```

Firebase console → ⚙️ → **Usage and billing** → **Modify plan** → **Blaze**
(απαιτείται κάρτα, αλλά έχει γενναιόδωρο δωρεάν όριο — πρακτικά δεν πληρώνεις
τίποτα στην αρχή).

```bash
firebase deploy --only firestore:rules,storage:rules,firestore:indexes

cd functions && npm install && cd ..
firebase deploy --only functions
```

Θα ανέβουν 4 functions: `initUserDoc`, `updateUserStats`, `settlePendingBets`,
`consumeScanCredit`.

---

## ΒΗΜΑ 7 — Τρέξε το στο κινητό σου

```bash
npx expo start
```

Θα εμφανιστεί ένα **QR code** στο terminal.
- **Android**: σκάναρέ το με την εφαρμογή Expo Go
- **iOS**: σκάναρέ το με την κάμερα του iPhone

Το app φορτώνει στο κινητό σου σε δευτερόλεπτα. Κάθε αλλαγή στον κώδικα
ενημερώνεται αυτόματα (hot reload).

---

## ΒΗΜΑ 8 — Δοκίμασε

1. Άνοιξε το tab **Σκανάρισμα** → "Φωτογράφισε το δελτίο" → δώσε άδεια κάμερας
2. Φωτογράφισε ένα δελτίο (ή πάτα "Επιλογή από φωτογραφίες" για screenshot)
3. "Ανάλυση με AI" → έλεγξε τα στοιχεία → Αποθήκευση
4. **Overview** → δες το PB Score να ενημερώνεται
5. **Δελτία** → βρες ένα κερδισμένο → "Share" → πάτα **Share 9:16 badge**
   → θα ανοίξει το native μενού κοινοποίησης με την εικόνα έτοιμη

---

## ΒΗΜΑ 9 — Build για τα stores (όταν είσαι έτοιμος)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # δοκιμαστικό APK
```

Για δημοσίευση χρειάζονται:
- **Google Play Console**: $25 εφάπαξ
- **Apple Developer**: $99/έτος

---

## ⚠️ Πριν το ανεβάσεις στα stores — διάβασέ το

Αυτό είναι το σημείο που είχαμε συζητήσει και **δεν λύνεται με κώδικα**:

1. **Κατηγοριοποίηση**: Και τα δύο stores έχουν αυστηρές πολιτικές για εφαρμογές
   που σχετίζονται με στοιχηματισμό. Ένα bet tracker χωρίς affiliate links συνήθως
   περνάει ευκολότερα από ένα με CPA links προς στοιχηματικές — αν βάλεις το
   affiliate monetization που είχες στο πλάνο, πιθανότατα κατατάσσεται ως gambling
   app και απαιτεί ξεχωριστή έγκριση ανά χώρα.
2. **Ελλάδα / ΕΕΕΠ**: Η προώθηση στοιχηματισμού εποπτεύεται. Ένα απλό disclaimer
   μπορεί να μην αρκεί — αξίζει να το ελέγξεις πριν επενδύσεις στους λογαριασμούς.
3. **Νομικά κείμενα**: Privacy Policy + Terms of Service είναι υποχρεωτικά και
   από τα δύο stores. Το app αποθηκεύει φωτογραφίες δελτίων (πιθανώς με ορατά
   στοιχεία λογαριασμού) → χρειάζεται ρητή αναφορά στο GDPR κείμενό σου.
4. **Age rating**: Θα χρειαστεί 18+ σε κάθε περίπτωση.

---

## Τι δεν έχει υλοποιηθεί ακόμα

- **VIP subscription (RevenueCat)** — το `vipStatus` field υπάρχει, αλλά τίποτα
  δεν το αλλάζει· κάθε χρήστης ξεκινάει με 5 δωρεάν scans
- **API-Football auto-settlement** — το `settlePendingBets` function είναι έτοιμο
  αλλά η `fetchFixtureResult()` είναι stub· μέχρι να βάλεις RapidAPI key, ο
  χρήστης βάζει μόνος του το αποτέλεσμα (μια χαρά για MVP)
- **AdMob** — δεν έχει προστεθεί καθόλου
- **Login screen** — προς το παρόν anonymous auth· ο χρήστης χάνει τα δεδομένα
  του αν αλλάξει συσκευή. Πριν το launch, πρόσθεσε Google/Email sign-in.
- **Team logos** στο badge — χρησιμοποιούνται αρχικά ομάδων· τα επίσημα εμβλήματα
  είναι κατοχυρωμένα σήματα και χρειάζονται δικό σου licensed asset pack
