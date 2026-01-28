
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let chatSession: Chat | null = null;
let aiClient: GoogleGenAI | null = null;
let lastError: string | null = null;

// Función para obtener el cliente, asegurando que se crea con la clave
const getAiClient = (): GoogleGenAI | null => {
    if (aiClient) return aiClient;
    
    // Intento 1: process.env (Standard/Vercel)
    let apiKey = process.env.API_KEY;

    // Intento 2: import.meta.env (Vite nativo) - Fallback
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        // @ts-ignore
        if (import.meta.env && import.meta.env.VITE_API_KEY) {
            // @ts-ignore
            apiKey = import.meta.env.VITE_API_KEY;
        }
    }
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        console.warn("⚠️ API Key de Google GenAI no detectada.");
        lastError = "Falta la API Key en la configuración.";
        return null;
    }
    
    try {
        aiClient = new GoogleGenAI({ apiKey: apiKey });
        console.log("🟢 Cliente IA creado.");
        return aiClient;
    } catch (e: any) {
        console.error("Error fatal inicializando cliente AI:", e);
        lastError = e.message || "Error al inicializar cliente.";
        return null;
    }
};

// Función para iniciar o reiniciar el chat con un contexto específico
export async function startNewChat(contextData: string = ""): Promise<boolean> {
    aiClient = null; 
    const ai = getAiClient();
    
    if (!ai) {
        chatSession = null;
        return false;
    }

    const systemInstruction = `
Eres Gemini, un asistente en la app "Consulta de Tarifas".
TU COMPORTAMIENTO:
1. Responde SIEMPRE EN ESPAÑOL.
2. Sé profesional y conciso.
3. Usa los siguientes datos para responder si es pertinente:
${contextData ? contextData.substring(0, 40000) : "Sin datos visualizados."}
    `;

    try {
        // INTENTO 1: Modelo Principal (Gemini 3)
        chatSession = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction, temperature: 0.7 },
        });
        console.log("✅ Chat Gemini 3 iniciado.");
        return true;
    } catch (error) {
        console.warn("⚠️ Fallo Gemini 3, intentando modelo de respaldo...", error);
        try {
            // INTENTO 2: Modelo de Respaldo (Gemini 2.5) - Más estable si el 3 falla
            chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction, temperature: 0.7 },
            });
            console.log("✅ Chat Gemini 2.5 iniciado (Fallback).");
            return true;
        } catch (err2: any) {
            console.error("❌ Error fatal creando sesión de chat:", err2);
            chatSession = null;
            lastError = err2.message || "Error al crear sesión.";
            return false;
        }
    }
}

export async function getBotResponse(message: string): Promise<string> {
  try {
    // Si no hay sesión, intentar iniciar una nueva al vuelo
    if (!chatSession) {
        console.log("🔄 Intentando reconexión automática...");
        const success = await startNewChat();
        if (!success) {
            return `Error de conexión: ${lastError || "Verifica tu API Key."}`;
        }
    }

    if (!chatSession) {
        return "Error crítico: No se pudo establecer comunicación con la IA.";
    }

    const result: GenerateContentResponse = await chatSession.sendMessage({ message: message });
    
    if (result && result.text) {
        return result.text;
    } else {
        return "No he recibido una respuesta válida. Por favor, inténtalo de nuevo.";
    }

  } catch (error: any) {
    console.error("Error API Gemini:", error);
    chatSession = null; // Forzar reinicio para la próxima
    aiClient = null;

    if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
        return "Error de autenticación: Tu API Key no es válida o ha caducado.";
    }
    
    return "Ha ocurrido un error de conexión temporal. Por favor, pregunta de nuevo.";
  }
}
