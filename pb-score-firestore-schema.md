# PlayMind PB Score — Firestore Schema

## `users/{userId}`

Ένα document ανά χρήστη, id = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | Όνομα προφίλ |
| `email` | string | Από Firebase Auth |
| `createdAt` | timestamp | |
| `vipStatus` | string | `"free"` \| `"vip"` |
| `vipExpiresAt` | timestamp \| null | Από RevenueCat webhook |
| `scanCreditsRemaining` | number | Για freemium όριο scans/μήνα (πχ 5 δωρεάν) |
| `pbScore` | number | Cached — υπολογισμένο, όχι πηγή αλήθειας (βλ. παρακάτω) |
| `pbTier` | string | `"rookie"` \| `"sharp"` \| `"pro"` \| `"legend"` |
| `stats.totalBets` | number | Cached σύνοψη |
| `stats.settledBets` | number | |
| `stats.wins` | number | |
| `stats.losses` | number | |
| `stats.totalStaked` | number | |
| `stats.netProfitLoss` | number | |
| `stats.hitRate` | number | 0-100 |
| `stats.roi` | number | % |
| `stats.currentStreak` | number | Συνεχόμενες θετικές ημέρες |
| `stats.lastUpdated` | timestamp | |

**Γιατί cached stats στο user document:** Το dashboard/profile screen χρειάζεται αυτά τα νούμερα σε κάθε άνοιγμα. Αν τα υπολογίζεις live σαρώνοντας όλα τα bets κάθε φορά, θα σκαλώνει σε χρήστες με πολλά δελτία. Αντ' αυτού: ένα Cloud Function `onWrite` στο `bets` subcollection ξανα-υπολογίζει και γράφει το `stats` object στο parent user document.

## `bets/{betId}`

Flat top-level collection (όχι subcollection κάτω από user) ώστε να μπορείς να κάνεις collection-group queries αργότερα (πχ leaderboard, ή admin analytics σε όλα τα bets).

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Foreign key → `users/{userId}`, indexed |
| `sport` | string | `"football"` κ.λπ. — μελλοντική επέκταση |
| `fixtureId` | number \| null | Από API-Football, αν βρέθηκε match |
| `betType` | string | `"single"` \| `"multi"` (πολλαπλό/παρολί σε διαφορετικούς αγώνες) \| `"builder"` (bet builder — ίδιος αγώνας, πολλές αγορές μαζί) |
| `legs` | array | Κάθε επιλογή του δελτίου: `[{ league, matchName, market, pick, odds, status }]`. Ένα single bet έχει πάντα ακριβώς 1 leg. Το `status` ανά leg (`"won"`/`"lost"`/`null`) γεμίζει είτε από ρητή ένδειξη που είδε το OCR στο screenshot, είτε συνάγεται ως `"won"` για κάθε leg ενός νικηφόρου combo (μαθηματική βεβαιότητα) — ποτέ δεν μαντεύεται για ένα χαμένο combo χωρίς ρητή ένδειξη, οπότε μένει `null` ("άγνωστο") σε αυτή την περίπτωση. |
| `league` | string \| null | Derived: το league του leg αν single/builder, ή `"Μικτό"` αν το multi καλύπτει πάνω από ένα πρωτάθλημα |
| `matchName` | string | Derived: το πραγματικό ματς αν single/builder, ή π.χ. `"5 αγώνες"` αν multi — χρησιμοποιείται όπου εμφανίζεται συνοπτικός τίτλος (λίστα, badge) |
| `market` | string \| null | Derived: το market του leg αν single, `"Bet Builder"` αν builder, ή `"Πολλαπλό (Nx)"` αν multi — χρησιμοποιείται για ανάλυση απόδοσης ανά αγορά |
| `pick` | string | π.χ. "1 (Ολυμπιακός νίκη)" |
| `odds` | number | Η συνολική/συνδυασμένη απόδοση του δελτίου (product των leg odds αν multi/builder) |
| `stake` | number | |
| `currency` | string | Default `"EUR"` |
| `status` | string | `"pending"` \| `"won"` \| `"lost"` \| `"void"` |
| `profitLoss` | number | 0 όσο pending· signed όταν settle |
| `isVerified` | boolean | true αν το OCR extraction πέτυχε με υψηλή confidence *και* το αποτέλεσμα επιβεβαιώθηκε από API-Football· false αν είναι self-reported/χειροκίνητο |
| `sourceImageUrl` | string \| null | Firebase Storage path του screenshot (βλ. privacy note παρακάτω) |
| `ocrRawResponse` | map \| null | Το raw JSON που επέστρεψε το vision model, για debugging |
| `createdAt` | timestamp | |
| `settledAt` | timestamp \| null | Πότε μπήκε το τελικό αποτέλεσμα |
| `date` | string | `YYYY-MM-DD` σε local timezone χρήστη — προϋπολογισμένο πεδίο ώστε τα daily queries να μη χρειάζονται timestamp range μαθηματικά σε κάθε client |

### Indexes που θα χρειαστείς
- Composite: `userId` (ASC) + `date` (DESC) — για το "Σήμερα" query
- Composite: `userId` (ASC) + `status` (ASC) + `createdAt` (DESC) — για το Bet List filtering (Won/Lost/Pending tabs)
- Composite: `userId` (ASC) + `fixtureId` (ASC) — αν θες να κάνεις batch settlement lookup

## Πώς μπαίνει το αποτέλεσμα (settlement flow)

1. Ο χρήστης σκανάρει → το Gemini (μέσω Firebase AI Logic) επιστρέφει τα στοιχεία → bet γράφεται με `status: "pending"`, `isVerified: false`.
2. Ένα scheduled Cloud Function (πχ κάθε 15 λεπτά) παίρνει όλα τα `pending` bets με `fixtureId != null`, ρωτάει το API-Football για το τελικό σκορ, και αν ο αγώνας έχει τελειώσει, υπολογίζει `status` + `profitLoss` αυτόματα και βάζει `isVerified: true`.
3. Αν δεν βρέθηκε `fixtureId` (π.χ. obscure λίγκα που δεν καλύπτει το API), ο χρήστης μπορεί να το κάνει settle χειροκίνητα από το UI — παραμένει `isVerified: false` ("self-reported"), κάτι που ταιριάζει με το badge χρωματισμό που ήδη σκέφτεσαι (Verified vs Self-reported).

## Privacy / retention σημείωμα για τα screenshots

Τα `sourceImageUrl` περιέχουν φωτογραφίες δελτίων στοιχημάτων — ενδεχομένως ευαίσθητο περιεχόμενο (οικονομικά στοιχεία, μερικές φορές προσωπικά δεδομένα αν φαίνεται όνομα λογαριασμού bookmaker). Πρότεινε στο Firebase Storage security rules να είναι πρόσβασιμα *μόνο* από τον owner user, και βάλε lifecycle rule να διαγράφονται μετά από Χ μέρες αν δεν τα χρειάζεσαι μόνιμα — μειώνει και το storage κόστος και το compliance surface για το GDPR/Privacy Policy σου.

## Firestore Security Rules (σκελετός)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['vipStatus', 'vipExpiresAt', 'scanCreditsRemaining']);
      // vipStatus/scanCredits changes γίνονται ΜΟΝΟ από server-side (Cloud Function / RevenueCat webhook),
      // ποτέ απευθείας από τον client, αλλιώς ο χρήστης μπορεί να "δωρίσει" στον εαυτό του VIP.
      allow create: if request.auth != null && request.auth.uid == userId;
    }

    match /bets/{betId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId
                    // ο client μπορεί να διορθώσει δικά του λάθη OCR, αλλά ΟΧΙ να αλλάξει status σε "won"
                    // χειροκίνητα χωρίς verification, αν θες να κρατήσεις αξιοπιστία στο badge
                    && !(request.resource.data.isVerified == true && resource.data.isVerified == false);
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

Αυτό είναι σκελετός — θα το πάρεις στο Firebase console και θα το προσαρμόσεις, αλλά η βασική αρχή (client δεν αγγίζει VIP status ή verified flag) είναι σημαντική να μείνει.

## Πεδία που ίσως θες αργότερα αλλά όχι στο MVP
- `bets/{betId}.tags` (array) — για custom κατηγοριοποίηση από τον χρήστη (πχ "combo", "live bet")
- `users/{userId}.referralCode` / `referredBy` — αν θες affiliate loop και μέσα στην ίδια σου την εφαρμογή (users που φέρνουν users), ξεχωριστό από το CPA προς bookmakers
