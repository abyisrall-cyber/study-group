# EduPlateforme CI — Architecture de la base de données

Choix technique : **Firebase (Auth + Firestore + Realtime Database)**.
Raison : mise en place rapide de "Google Sign-In", pas de serveur à gérer, hébergement front en statique sur Vercel, et le Realtime Database est idéal pour le chat/compositions en direct (moins cher et plus simple que Socket.io + serveur Node séparé). Si un jour tu veux un vrai backend Node/Postgres, cette structure se transpose directement en tables SQL.

---

## 1. Collection `users` (Firestore)

```
users/{uid}
├── uid              string   (= Google UID)
├── eduId            string   ex: "EDU-2026-4821"   (unique, généré à la 1ère connexion)
├── nom               string
├── email             string
├── photoURL          string
├── etablissement      string
├── classe            string   enum: CP1..Terminale (voir §4)
├── serie             string   (A/C/D — uniquement pour 2nde/1ère/Tale, sinon null)
├── ville             string
├── region             string
├── serverId           string  (= classe + serie, ex: "3EME" ou "TLE-D")
├── groupeIds          array<string>   (groupes d'étude rejoints)
├── stats
│   ├── compositionsFaites   number
│   ├── scoreMoyen           number
│   └── matieresFortes       array<string>
├── createdAt          timestamp
└── lastSeen            timestamp
```

## 2. Collection `servers` (serveurs virtuels de classe — auto-générés)

```
servers/{serverId}            ex: servers/3EME, servers/TLE-D
├── niveau            string
├── serie             string | null
├── nbElevesActifs      number
├── membresIds          array<string>
└── matieresDisponibles array<string>
```

## 3. Collection `groupes` (groupes d'étude)

```
groupes/{groupeId}
├── nom                 string   ex: "Les cracks de la 3ème A"
├── classe              string
├── createurId           string
├── membres              array<{uid, nom, eduId, actif:boolean}>
├── createdAt             timestamp
└── compositionEnCours     string | null   (ref vers compositions/{id})

# Sous-collection temps réel :
groupes/{groupeId}/messages/{messageId}
├── auteurId       string
├── auteurNom       string
├── texte          string
├── imageURL        string | null
└── timestamp        timestamp
```

## 4. Collection `matieres` (contenu pédagogique)

```
matieres/{matiereId}          ex: "maths-3eme"
├── nom              string   (Mathématiques, Physique-Chimie, SVT...)
├── classe           string
├── icone            string

matieres/{matiereId}/lecons/{leconId}
├── titre
├── contenuHTML       (texte + images/schémas)
├── ordre             number
└── dureeLecture      number (min)

matieres/{matiereId}/videos/{videoId}
├── titre
├── urlVideo          (YouTube/Vimeo/CDN)
└── duree

matieres/{matiereId}/exercices/{exerciceId}
├── type              enum: "quiz" | "application" | "examen_national"
├── titre             ex: "BEPC 2023 - Session normale"
├── questions          array<{
│     enonce, choix[], reponseCorrecte, correctionDetaillee
│   }>
└── difficulte          enum: facile|moyen|difficile
```

## 5. Collection `compositions` (évaluations chronométrées)

```
compositions/{compoId}
├── type              enum: "groupe" | "matchmaking"
├── matiereId
├── classe
├── participants        array<{uid, nom, score, tempsRestant, statut}>
├── sujetId             ref -> exercices/{exerciceId}
├── dureeMinutes         number
├── statut              enum: "en_attente" | "en_cours" | "termine"
└── createdAt
```

## 6. Realtime Database (pour la synchro live — chat & compo)

```
/presence/{serverId}/{uid}         : true | false        (élève connecté ou non)
/compositionLive/{compoId}
    /participants/{uid}
        progression: number   (0-100)
        scoreLive: number
        derniereActivite: timestamp
/matchmaking/{serverId}/{matiereId}/queue/{uid}: timestamp   (file d'attente publique)
```

---

## Génération de l'ID unique (EDU-2026-XXXX)

À la première connexion Google, une Cloud Function (ou logique côté client + transaction Firestore) :
1. Prend l'année en cours.
2. Incrémente un compteur global `counters/eduId`.
3. Formate en `EDU-{annee}-{compteur sur 4 chiffres}`.

## Enum classes (`classe`)
`CP1, CP2, CE1, CE2, CM1, CM2, 6EME, 5EME, 4EME, 3EME, 2NDE, 1ERE, TERMINALE`
(pour 2NDE/1ERE/TERMINALE, le champ `serie` précise A, C ou D)
