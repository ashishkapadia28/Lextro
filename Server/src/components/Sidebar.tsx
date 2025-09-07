"use client";

import { useState } from "react";

interface SidebarProps {
  problemTitle: string;
}

export default function Sidebar({ problemTitle }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  const [explanationType, setExplanationType] = useState("logical");
  const [difficulty, setDifficulty] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchExplanation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle,
          difficulty,
          language,
          explanationType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponse(data.query.explanation);
      } else {
        setResponse(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setResponse("Error fetching explanation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: open ? 400 : 60,
        height: open ? 500 : 60,
        transition: "all 0.3s ease",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      {open ? (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
          <button
            onClick={() => setOpen(false)}
            style={{ alignSelf: "flex-end", marginBottom: 8 }}
          >
            ✕
          </button>

          <h2>Lextro AI</h2>
          <p>{problemTitle}</p>

          <input
            placeholder="Difficulty (optional)"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{ marginBottom: 8 }}
          />

          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ marginBottom: 8 }}>
            <option value="English">English</option>
            <option value="Hinglish">Hinglish</option>
          </select>

          <select value={explanationType} onChange={(e) => setExplanationType(e.target.value)} style={{ marginBottom: 8 }}>
            <option value="logical">Logical</option>
            <option value="company">Company Approach</option>
            <option value="code">Code Hints</option>
          </select>

          <button onClick={handleFetchExplanation} disabled={loading}>
            {loading ? "Loading..." : "Get Explanation"}
          </button>

          <div style={{ marginTop: 16, overflowY: "auto", flexGrow: 1 }}>
            {response && <pre>{response}</pre>}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            backgroundColor: "#0070f3",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 24,
          }}
        >
          💡
        </button>
      )}
    </div>
  );
}
