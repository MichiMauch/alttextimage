import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fetchChatGPTResponse } from '../../src/utils/openaiService';

// Funktion zum Laden und Umwandeln der CSV-Daten in einen String
const loadCsvData = () => {
  try {
    const filePath = path.resolve('./public/hitparade.csv'); // Pfad zur CSV-Datei
    const file = fs.readFileSync(filePath, 'utf8');
    const parsedData = Papa.parse(file, { header: true }).data;

    // Konvertiere die CSV-Daten in eine klar strukturierte Form
    let dataString = parsedData.map(row => {
      return `Interpret: ${row.Interpret}, Titel: ${row.Titel}, Datum: ${row.Eintritt}, Wochen in den Charts: ${row.Wochen}, Punkte: ${row.Punkte}`;
    }).join('\n');

    return dataString;
  } catch (error) {
    console.error('Fehler beim Laden oder Parsen der CSV-Daten:', error);
    throw new Error('CSV-Daten konnten nicht geladen werden');
  }
};

export default async function handler(req, res) {
  try {
    const { query, conversationHistory } = req.body;  // Die Frage des Benutzers und der bisherige Verlauf der Konversation

    // Initialisiere conversationHistory, falls es nicht vorhanden ist
    const updatedConversationHistory = Array.isArray(conversationHistory) ? conversationHistory : [];

    // Überprüfe, ob query vorhanden ist
    if (typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Fehlende oder ungültige query im Request' });
    }

    // Lade die CSV-Daten und konvertiere sie in Textform
    const hitparadeData = loadCsvData();

    // Konvertiere den bisherigen Verlauf in einen Text, der im Prompt genutzt wird
    const historyText = updatedConversationHistory.length > 0
      ? updatedConversationHistory.map((entry) => `Benutzer: ${entry.question}\nHitparadeBot: ${entry.answer}`).join('\n') + '\n'
      : '';

    // Erstelle den Prompt, der den bisherigen Verlauf sowie die CSV-Daten einbindet
    const prompt = `
      Du bist der HitparadeBot und kennst alle Hits der Hitparade. Hier sind sämtliche Daten der Hitparade in einer klaren Struktur:
      
      ${hitparadeData}
      
      Das folgende ist der Verlauf der Konversation:
      ${historyText}Benutzer: "${query}"
      HitparadeBot:
    `;

    // Sende den angepassten Prompt an GPT
    const botResponse = await fetchChatGPTResponse(prompt);

    // Füge die aktuelle Frage und Antwort dem Verlauf hinzu
    updatedConversationHistory.push({ question: query, answer: botResponse.trim() });

    res.status(200).json({ response: botResponse.trim(), conversationHistory: updatedConversationHistory });
  } catch (error) {
    console.error('Fehler beim Abrufen der GPT-Antwort:', error);
    res.status(500).json({ error: 'Fehler bei der Verarbeitung der Anfrage' });
  }
}
