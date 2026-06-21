import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem("uo_user"); // On utilise une nouvelle clé unique
    if (u) setUser(JSON.parse(u));
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🛠️ Test de Persistance</h1>
      
      <div style={{ margin: '20px', padding: '20px', border: '2px solid #ccc', borderRadius: '10px' }}>
        <p>Utilisateur en mémoire : <strong>{user ? `OUI ✅ (${user.prenom})` : "NON ❌"}</strong></p>
      </div>

      <button 
        onClick={() => {
          const testUser = { prenom: "Nicolas", nom: "Landry", role: "superadmin" };
          localStorage.setItem("uo_user", JSON.stringify(testUser));
          alert("Info enregistrée ! Je vais rafraîchir la page...");
          window.location.reload();
        }}
        style={{ padding: '15px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Étape 1 : Forcer l'enregistrement manuel
      </button>

        
  


      <button 
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Vider tout et recommencer
      </button>
    </div>
  );
}
