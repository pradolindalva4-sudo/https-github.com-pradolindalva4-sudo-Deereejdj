
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * TITANIUM V12 - AGENTE DE PUBLICIDADE E COMPILAÇÃO MASTER
 */

const getAI = () => {
    const key = process.env.API_KEY;
    if (!key) throw new Error("CHAVE_API_AUSENTE");
    return new GoogleGenAI({ apiKey: key });
};

export const generateAdScript = async (topic: string, type: 'comercial' | 'homenagem' = 'comercial') => {
    try {
        const ai = getAI();
        // Prompt simplificado para evitar erros de formatação
        const prompt = type === 'homenagem' 
            ? `Escreva apenas uma frase de locução de rádio profissional de até 15 palavras para homenagear: ${topic}. Não use aspas nem títulos.`
            : `Escreva apenas uma frase de rádio explosiva e profissional de até 12 palavras para o anúncio: ${topic}. Não use aspas nem títulos.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.replace(/[*#"`]/g, '').trim() || "Parabéns por esse dia especial!";
    } catch (e) {
        throw new Error("ERRO_SCRIPT_GEMINI");
    }
};

export const generateVoiceOver = async (text: string, voiceName: string = 'Kore') => {
    try {
        const ai = getAI();
        // Limpeza rigorosa do texto para evitar Erro 500/Internal na Gemini TTS
        const cleanText = text.replace(/[*#_~`[\]()]/g, '').trim();
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            console.error("Gemini Response candidate error:", response);
            throw new Error("SEM_DADOS_DE_AUDIO_DA_API");
        }
        return audioData;
    } catch (e: any) { 
        console.error("Erro Crítico Gemini TTS:", e);
        throw e;
    }
};
