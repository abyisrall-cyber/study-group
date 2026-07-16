# EduPlateforme CI — Guide de démarrage

## Ce que tu as
- `01-architecture-base-de-donnees.md` → schéma complet Firestore + Realtime Database
- `index.html` → landing page (Google Sign-In)
- `dashboard.html` → tableau de bord élève (ID unique, serveur de classe, matières, compositions)
- `firebase-config.js` → toute la logique : auth, ID unique, groupes, chat temps réel, compositions

Tout est en HTML/JS "vanilla" + Tailwind CDN, donc **zéro build** : ça se déploie directement sur Vercel comme site statique (comme tes autres projets).

## Mise en place Firebase (10 min)
1. Va sur https://console.firebase.google.com → crée un projet "EduPlateforme CI".
2. Active **Authentication > Google** (méthode de connexion).
3. Active **Firestore Database** (mode production) et **Realtime Database**.
4. Dans "Paramètres du projet > Général > Tes applications", ajoute une app Web et copie la config.
5. Colle cette config dans `firebase-config.js` (section `firebaseConfig`).
6. **Règles de sécurité Firestore** (à adapter, exemple de base) :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /groupes/{groupeId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, create: if request.auth != null;
      }
    }
    match /{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

## Reste à créer (les autres pages du parcours)
- `onboarding.html` : formulaire établissement / classe / série / ville (appelle `finaliserProfil()`)
- Pages "Matières", "Groupes", "Compositions" détaillées — même logique que le dashboard, juste plus d'écrans
- Import des sujets BEPC/BAC dans la sous-collection `exercices` (tu peux me donner les PDF officiels et je les transforme en JSON structuré)

## Déploiement Vercel
```
vercel --prod
```
Comme il n'y a pas de build, choisis "Other" comme framework preset et laisse le dossier racine tel quel.

## ⚠️ Sécurité
Ne partage jamais tes clés Firebase/API en clair dans un chat ou un repo public — sur le web (config Firebase) ce n'est pas grave car elle est publique par design (protégée par les règles Firestore ci-dessus), mais si tu ajoutes plus tard une clé serveur (ex: pour générer des PDF, appeler une IA, etc.), mets-la **uniquement** en variable d'environnement Vercel, jamais dans le code.
