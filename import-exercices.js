// import-exercices.js
// Importe exercices-bepc.json dans Firestore, sous matieres/{matiereId}/exercices/{id}
//
// Installation : npm install firebase-admin
// Récupère ta clé de service : Console Firebase > Paramètres du projet >
//   Comptes de service > "Générer une nouvelle clé privée" (fichier serviceAccountKey.json)
//
// Utilisation : node import-exercices.js

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // à télécharger depuis la console Firebase
const exercices = require("./exercices-bepc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function importer() {
  let count = 0;
  for (const ex of exercices) {
    const { matiereId, id, ...donnees } = ex;

    // S'assure que le document matiere existe (nom lisible déduit de l'id)
    const matiereRef = db.collection("matieres").doc(matiereId);
    const matiereSnap = await matiereRef.get();
    if (!matiereSnap.exists) {
      await matiereRef.set({
        nom: matiereId.split("-")[0].charAt(0).toUpperCase() + matiereId.split("-")[0].slice(1),
        classe: "3EME"
      });
      console.log(`Matière créée : ${matiereId}`);
    }

    await matiereRef.collection("exercices").doc(id).set(donnees);
    count++;
    console.log(`Importé : ${matiereId}/exercices/${id}`);
  }
  console.log(`\n${count} sujets importés avec succès.`);
}

importer().catch(err => {
  console.error("Erreur d'import :", err);
  process.exit(1);
});
