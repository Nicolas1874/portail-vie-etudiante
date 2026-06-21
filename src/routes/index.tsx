import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // On récupère TOUT ce qu'il y a dans la mémoire pour comprendre
    const u = localStorage.getItem("user");
    const a = localStorage.getItem("applications");
    
    setDebugInfo({
      rawUser: u,
      rawApps: a,
      browser: navigator.userAgent
    });

    if (u && u !== "undefined" && u !== "null") {
      try {
        const parsedUser = JSON.parse(u);
        setUser(parsedUser);
      } catch (e) {
        console.error("Erreur de lecture du JSON", e);
      }
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#2563eb' }}>🛠️ Debug Portail</h1>
      
      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ccc' }}>
        <h3>1. État de la session :</h3>
        <p>Utilisateur détecté : <strong>{user ? "OUI ✅" : "NON ❌"}</strong></p>
        {user && (
          <div style={{ background: '#e0ffe0', padding: '10px' }}>
            <p>Nom : {user.prenom} {user.nom}</p>
            <p>Rôle : <strong>{user.role}</strong></p>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ccc' }}>
        <h3>2. Contenu brut de la mémoire (localStorage) :</h3>
        <p><strong>Clé "user" :</strong></p>
        <pre style={{ background: '#eee', padding: '10px', overflow: 'auto' }}>
          {debugInfo.rawUser || "VIDE (null)"}
        </pre>
        
        <p><strong>Clé "applications" :</strong></p>
        <pre style={{ background: '#eee', padding: '10px', overflow: 'auto' }}>
          {debugInfo.rawApps || "VIDE (null)"}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.href = "/login"} style={{ padding: '10px', marginRight: '10px' }}>
          Aller au Login
        </button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding: '10px', color: 'red' }}>
          Vider la mémoire et rafraîchir
        </button>
      </div>

      {user && user.role && user.role.toLowerCase() === 'superadmin' && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#2563eb', color: 'white', borderRadius: '8px' }}>
          <h2>🚀 ACCÈS SUPERADMIN DÉTECTÉ</h2>
          <p>Si vous voyez ce bloc bleu, on peut remettre les tuiles !</p>
        </div>
      )}
    </div>
  );
}
