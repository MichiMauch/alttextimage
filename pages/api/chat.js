// pages/api/chat.js
import { fetchChatGPTResponse } from '../../src/utils/openaiService';

export default async function handler(req, res) {
  const { prompt } = req.body;

  try {
    // Verwende die Utility-Funktion, um die Antwort von OpenAI zu holen
    const responseText = await fetchChatGPTResponse(prompt);
    res.status(200).json({ text: responseText });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Antwort' });
  }
}
