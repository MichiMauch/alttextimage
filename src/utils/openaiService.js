// src/utils/openaiService.js
import axios from 'axios';

// Funktion, die den Prompt an die OpenAI API schickt
export async function fetchChatGPTResponse(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',  // Richtiger Endpunkt
      {
        model: 'gpt-3.5-turbo',  // Du kannst hier 'gpt-4' verwenden, wenn du Zugang hast
        messages: [{ role: 'user', content: prompt }],  // Korrekte Struktur für Chat-Modelle
        max_tokens: 3000,  // Anpassbare Länge der Antwort
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,  // API-Key verwenden
        },
      }
    );
    return response.data.choices[0].message.content;  // Korrekte Antwort aus dem Chat-Modell
  } catch (error) {
    console.error('Fehler beim Abrufen der GPT-Antwort:', error);
    throw new Error('API-Anfrage fehlgeschlagen');
  }
}
