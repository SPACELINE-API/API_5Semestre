const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function App() {
  return (
    <main>
      <h1>API 5 Semestre</h1>
      <p>Backend: {apiUrl}</p>
    </main>
  );
}
