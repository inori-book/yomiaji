const PY_API_URL = process.env.PY_API_URL || "http://127.0.0.1:8001";

export async function pyHealth() {
  const r = await fetch(`${PY_API_URL}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error(`py api not ok: ${r.status}`);
  return r.json();
}

export async function pySearch(query: string) {
  const r = await fetch(`${PY_API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!r.ok) throw new Error(`py api not ok: ${r.status}`);
  return r.json();
}

export async function pyKeywords(text: string) {
  const r = await fetch(`${PY_API_URL}/keywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`py api not ok: ${r.status}`);
  return r.json();
}
