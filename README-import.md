# Import des sujets BEPC dans Firestore

## Ce que contient ce dossier
- `exercices-bepc.json` : **12 sujets BEPC structurés** (session 2026 zone I complète : Maths, Physique-Chimie,
  Histoire-Géo, Composition française, Allemand, Espagnol, Anglais zones I/II/III ; + session 2025 Anglais
  zones I/II/III en référence). Chaque sujet est découpé en `parties` (exercice/partie, barème, énoncé) avec
  le `corrige` quand le PDF le fournissait.
- `import-exercices.js` : script Node qui pousse ce JSON vers Firestore (`matieres/{matiereId}/exercices/{id}`).
- `build_exercices_bepc.py` : le script Python qui a généré le JSON (utile si tu m'envoies d'autres PDF à
  ajouter — je peux éditer ce fichier plutôt que de tout réécrire à la main).

## Pourquoi le corrigé est parfois `null`
Certains PDF que tu as envoyés étaient des sujets seuls (pas de corrigé fourni) : Maths, Composition française,
Allemand, Espagnol, Anglais zones II/III (2026), Anglais zone II (2025). Dès que tu as les corrigés
correspondants, envoie-les-moi et je complète le JSON.

## Comment importer
```bash
npm install firebase-admin
node import-exercices.js
```
Il te faut au préalable une clé de service Firebase (`serviceAccountKey.json`) :
Console Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée.
**Ne partage jamais ce fichier ni son contenu — garde-le uniquement en local, jamais dans un repo public.**

## Pour la suite
- Chaque sujet a un champ `difficulte` (facile/moyen/difficile) déjà rempli pour matcher le badge de couleur
  dans `matieres.html`.
- Le champ `type` est toujours `"examen_national"` — cohérent avec le schéma de `01-architecture-base-de-donnees.md`.
- Si tu veux que je transforme aussi les PDF en vrais QCM auto-corrigés (pour le mode composition chronométrée),
  dis-le-moi : pour ça il faut des sujets à choix multiples (comme les BEPC 2026 Maths ex.1 ou PC), je peux les
  reformater au format `questions: [{enonce, choix[], reponseCorrecte}]` utilisé par `compositions.html`.
