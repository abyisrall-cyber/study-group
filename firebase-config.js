// ============================================================
// EduPlateforme CI — firebase-config.js
// Auth Google + ID unique + groupes + chat/compositions en temps réel
// A importer avec <script type="module" src="firebase-config.js">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCHIjyKDMak7DZSktbdR8anluRIisU3go0",
    authDomain: "eduplateforme-ci.firebaseapp.com",
    projectId: "eduplateforme-ci",
    storageBucket: "eduplateforme-ci.firebasestorage.app",
    messagingSenderId: "860742134332",
    appId: "1:860742134332:web:72a2534457e659eb707139",
    measurementId: "G-MQFVEY1DKN"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion,
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  runTransaction, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getDatabase, ref, onValue, onDisconnect, set as rtdbSet
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// --- 1. Configuration --------------------------------------------------
// Remplace ces valeurs par celles de ta console Firebase (Project settings > Web app).
// Ne partage JAMAIS ces clés dans un message ou un repo public — mets-les
// en variables d'environnement Vercel si tu passes par un build (Next.js/Vite).
const firebaseConfig = {
  apiKey: "TA_CLE_API",
  authDomain: "eduplateforme-ci.firebaseapp.com",
  projectId: "eduplateforme-ci",
  storageBucket: "eduplateforme-ci.appspot.com",
  messagingSenderId: "TON_SENDER_ID",
  appId: "TON_APP_ID",
  databaseURL: "https://eduplateforme-ci-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const provider = new GoogleAuthProvider();

// --- 2. Connexion Google + attribution de l'ID unique -------------------
export async function connexionGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const eduId = await genererEduId();
      await setDoc(userRef, {
        uid: user.uid,
        nom: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        eduId,
        etablissement: null,
        classe: null,
        serie: null,
        ville: null,
        region: null,
        serverId: null,
        groupeIds: [],
        stats: { compositionsFaites: 0, scoreMoyen: 0, matieresFortes: [] },
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
      window.location.href = "/onboarding.html"; // page pour renseigner établissement/classe/ville
    } else {
      await updateDoc(userRef, { lastSeen: serverTimestamp() });
      window.location.href = "/dashboard.html";
    }
  } catch (err) {
    console.error("Erreur de connexion :", err);
    alert("La connexion a échoué. Réessaie.");
  }
}

export function deconnexion() {
  return signOut(auth).then(() => window.location.href = "/index.html");
}

// Génère un ID du type EDU-2026-0001 via un compteur transactionnel (anti-collision).
async function genererEduId() {
  const annee = new Date().getFullYear();
  const compteurRef = doc(db, "counters", `eduId-${annee}`);
  const nouveauNumero = await runTransaction(db, async (transaction) => {
    const compteurSnap = await transaction.get(compteurRef);
    const actuel = compteurSnap.exists() ? compteurSnap.data().valeur : 0;
    const suivant = actuel + 1;
    transaction.set(compteurRef, { valeur: suivant });
    return suivant;
  });
  return `EDU-${annee}-${String(nouveauNumero).padStart(4, "0")}`;
}

// --- 3. Finaliser le profil -> calcule le serverId et rejoint le serveur ----
export async function finaliserProfil(uid, { etablissement, classe, serie, ville, region }) {
  const serverId = serie ? `${classe}-${serie}`.toUpperCase() : classe.toUpperCase();
  await updateDoc(doc(db, "users", uid), { etablissement, classe, serie: serie || null, ville, region, serverId });

  const serverRef = doc(db, "servers", serverId);
  const serverSnap = await getDoc(serverRef);
  if (!serverSnap.exists()) {
    await setDoc(serverRef, { niveau: classe, serie: serie || null, nbElevesActifs: 1, membresIds: [uid] });
  } else {
    await updateDoc(serverRef, { membresIds: arrayUnion(uid) });
  }
  // Présence en temps réel sur le serveur de classe
  const presenceRef = ref(rtdb, `presence/${serverId}/${uid}`);
  rtdbSet(presenceRef, true);
  onDisconnect(presenceRef).set(false);

  return serverId;
}

// --- 4. Groupes d'étude : création + ajout par ID unique --------------------
export async function creerGroupe(nom, classe, createurUid, createurNom, createurEduId) {
  const groupeRef = await addDoc(collection(db, "groupes"), {
    nom, classe, createurId: createurUid,
    membres: [{ uid: createurUid, nom: createurNom, eduId: createurEduId, actif: true }],
    createdAt: serverTimestamp(),
    compositionEnCours: null
  });
  await updateDoc(doc(db, "users", createurUid), { groupeIds: arrayUnion(groupeRef.id) });
  return groupeRef.id;
}

// Recherche un élève par son ID unique (EDU-2026-XXXX) puis l'ajoute au groupe.
export async function ajouterMembreParEduId(groupeId, eduIdRecherche) {
  const q = query(collection(db, "users"), where("eduId", "==", eduIdRecherche));
  const resultats = await getDocs(q);
  if (resultats.empty) {
    throw new Error("Aucun élève trouvé avec cet ID.");
  }
  const eleve = resultats.docs[0].data();
  await updateDoc(doc(db, "groupes", groupeId), {
    membres: arrayUnion({ uid: eleve.uid, nom: eleve.nom, eduId: eleve.eduId, actif: true })
  });
  await updateDoc(doc(db, "users", eleve.uid), { groupeIds: arrayUnion(groupeId) });
}

// --- 5. Chat de groupe en temps réel (Firestore onSnapshot) -----------------
export function ecouterMessagesGroupe(groupeId, callback) {
  const messagesRef = collection(db, "groupes", groupeId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function envoyerMessageGroupe(groupeId, auteurId, auteurNom, texte, imageURL = null) {
  await addDoc(collection(db, "groupes", groupeId, "messages"), {
    auteurId, auteurNom, texte, imageURL, timestamp: serverTimestamp()
  });
}

// --- 6. Composition en temps réel (Realtime Database pour la latence faible) -
// Suivre la progression live des membres d'une composition (groupe ou matchmaking).
export function ecouterProgressionComposition(compoId, callback) {
  const compoRef = ref(rtdb, `compositionLive/${compoId}/participants`);
  return onValue(compoRef, (snapshot) => callback(snapshot.val() || {}));
}

export function mettreAJourProgression(compoId, uid, progression, scoreLive) {
  const participantRef = ref(rtdb, `compositionLive/${compoId}/participants/${uid}`);
  return rtdbSet(participantRef, { progression, scoreLive, derniereActivite: Date.now() });
}

// File d'attente publique pour le matchmaking ("Ligne ouverte")
export function rejoindreMatchmaking(serverId, matiereId, uid) {
  const fileRef = ref(rtdb, `matchmaking/${serverId}/${matiereId}/queue/${uid}`);
  return rtdbSet(fileRef, Date.now());
}

export function ecouterFileMatchmaking(serverId, matiereId, callback) {
  const fileRef = ref(rtdb, `matchmaking/${serverId}/${matiereId}/queue`);
  return onValue(fileRef, (snapshot) => callback(snapshot.val() || {}));
}

// --- 7. Observer l'état de connexion globalement ---------------------------
export function observerConnexion(callback) {
  return onAuthStateChanged(auth, callback);
}

export { auth, db, rtdb };
