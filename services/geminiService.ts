
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// DIAGNÓSTICO DE INICIO
let ai: GoogleGenAI | null = null;

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR CRÍTICO: No se ha detectado la GEMINI_API_KEY en el entorno.");
} else {
    console.log("🔑 Estado API Key: Detectada (Longitud: " + process.env.GEMINI_API_KEY.length + ")");
    // Inicialización estricta según las directrices de la plataforma.
    try {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
        console.error("❌ Error al inicializar GoogleGenAI:", e);
    }
}

let chatSession: Chat | null = null;

/**
 * Inicia o reinicia la sesión de chat.
 */
export async function startNewChat(): Promise<void> {
    const systemInstruction = `
Eres Gemini, un asistente de inteligencia artificial experto integrado en la aplicación corporativa "Consulta de Tarifas".

TU MISIÓN:
1. Ayudar a los usuarios (supervisores y administradores) a analizar la base de datos de artículos, precios y tarifas de la empresa.
2. Responder a cualquier otra pregunta general o consulta que el usuario pueda tener, actuando como un asistente personal versátil.

REGLAS DE COMPORTAMIENTO:
1. **Idioma:** DEBES RESPONDER SIEMPRE EN ESPAÑOL.
2. **Rol:** Profesional, analítico, amable y extremadamente servicial.
3. **Acceso a Datos:** Tienes acceso a un subconjunto de la base de datos que se te proporciona en cada mensaje como "Contexto relevante". Úsalo para responder preguntas sobre productos, precios y stock.
4. **Análisis de Datos:** Si el contexto contiene una lista de artículos, puedes realizar conteos, comparaciones de precios, identificar ofertas y resumir información de manera precisa.
5. **Versatilidad:** Si el usuario pregunta algo que NO está relacionado con la base de datos (ej: "¿Cómo está el clima?", "¿Puedes escribirme un correo?", "Explícame qué es la inflación"), responde de manera adecuada usando tu conocimiento general. No te limites solo a los datos de la app.
6. **Prioridad:** Si la pregunta parece referirse a un producto pero no está en el contexto, indica que no lo encuentras en el listado actual, pero ofrece ayuda general si es posible.
7. **Formato:** Usa Markdown para tablas, listas o negritas para mejorar la legibilidad.
`;

    try {
        if (!ai) {
            console.error("❌ ERROR: GoogleGenAI (ai) es null al intentar iniciar el chat.");
            throw new Error("GoogleGenAI no está inicializado.");
        }
        // Intentamos crear el chat con el modelo principal
        chatSession = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            },
        });
        console.log("✅ Sesión de chat IA iniciada correctamente.");
    } catch (error) {
        console.error("❌ Error detallado al iniciar sesión de chat:", error);
        chatSession = null;
    }
}

/**
 * Envía un mensaje al bot y obtiene la respuesta con contexto relevante.
 */
export async function getBotResponse(message: string, context: string = ""): Promise<string> {
    try {
        // Si la sesión se perdió (por recarga o error previo), intentamos recuperarla
        if (!chatSession) {
            await startNewChat();
        }

        if (!chatSession) {
            return "Lo siento, no puedo conectar con el servicio de IA en este momento. Por favor, verifica tu configuración.";
        }

        const prompt = `
Contexto relevante:
${context ? context : "No hay datos específicos relevantes para esta pregunta."}

Pregunta del usuario:
${message}
`;

        const result: GenerateContentResponse = await chatSession.sendMessage({ message: prompt });
        
        if (result && result.text) {
            return result.text;
        } else {
            return "No he podido generar una respuesta. Inténtalo de nuevo.";
        }

    } catch (error: any) {
        console.error("Error en getBotResponse:", error);
        
        // Invalidamos la sesión para forzar reinicio en el siguiente intento
        chatSession = null;

        if (error.message && error.message.includes('API key')) {
            return "Error de configuración: La API Key no es válida o no se ha encontrado. Revisa la consola del navegador.";
        }
        
        return `Ha ocurrido un error al procesar tu solicitud: ${error.message || "Error desconocido"}. Inténtalo de nuevo en unos segundos.`;
    }
}
