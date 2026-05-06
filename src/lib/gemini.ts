import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function categorizeTransaction(description: string, amount: number, tipo: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize this financial transaction: "${description}" for $${amount} (${tipo}). 
      Return a JSON object with:
      1. "categoria_ia": string (e.g. "Alimentación", "Transporte", "Vivienda", "Salud", "Ocio", "Ingresos")
      2. "etiquetas_ia": array of strings (relevant tags like #comida, #oficina, #lujo)
      3. "resumen": a very brief summary of why it was categorized this way.
      
      Respond ONLY with the JSON object.`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("AI Categorization failed", err);
    return null;
  }
}

export async function generateWeeklyInsights(transactions: any[], budgets: any[]) {
  try {
    const historicalData = transactions.slice(0, 20).map(t => ({
      desc: t.descripcion,
      amt: t.monto,
      cat: t.categoria_nombre,
      date: t.fecha_transaccion
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these financial transactions and budgets for the user.
      Transactions: ${JSON.stringify(historicalData)}
      Budgets: ${JSON.stringify(budgets)}
      
      Provide:
      1. A prediction of total spending for next week.
      2. Three personalized saving recommendations in Spanish.
      3. A summary of current budget health.
      
      Respond as a JSON object with properties: "prediccion_monto", "recomendaciones" (array), "analisis_presupuesto".`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("AI Insights failed", err);
    return null;
  }
}
