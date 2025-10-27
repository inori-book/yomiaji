import { pyHealth } from "@/lib/py";

export async function GET() {
  try {
    const data = await pyHealth();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Python API not available", details: error instanceof Error ? error.message : String(error) },
      { status: 503 }
    );
  }
}
