import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fetchChatGPTResponse } from '../../src/utils/openaiService';

// Funktion zur Analyse der Stimmung einer Bewertung
const analyzeSentiment = (review) => {
  const positiveKeywords = ["freundlich", "sauber", "perfekt", "toll", "empfehlen", "schön", "super"];
  const negativeKeywords = ["Problem", "doof", "schade", "teuer", "ausgebucht", "Duschen", "kosten"];

  let score = 0;

  positiveKeywords.forEach((word) => {
    if (review.toLowerCase().includes(word.toLowerCase())) score += 1;
  });

  negativeKeywords.forEach((word) => {
    if (review.toLowerCase().includes(word.toLowerCase())) score -= 1;
  });

  if (score > 0) return "positiv";
  if (score < 0) return "negativ";
  return "neutral";
};

// Funktion zum Laden und Analysieren der CSV-Daten
const loadCsvData = () => {
  try {
    const filePath = path.resolve('./public/bewertungen.csv'); // Pfad zur CSV-Datei
    const file = fs.readFileSync(filePath, 'utf8');
    const parsedData = Papa.parse(file, { header: false }).data;

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let allReviews = [];

    // Analysiere die Stimmung und sammle alle Bewertungen
    parsedData.forEach((row, index) => {
      if (row.length > 0 && typeof row[0] === 'string' && row[0].trim() !== '') { // Überprüfe, ob die Zeile gültig ist
        const review = row[0].trim(); // Nimm an, dass die Bewertung im ersten Feld steht und trimme sie
        const sentiment = analyzeSentiment(review);

        allReviews.push({ review, sentiment });

        if (sentiment === "positiv") {
          positiveCount++;
        } else if (sentiment === "negativ") {
          negativeCount++;
        } else {
          neutralCount++;
        }
      } else {
        console.warn(`Überspringe leere oder ungültige Zeile ${index + 1}`);
      }
    });

    console.log(`Anzahl der analysierten Bewertungen: ${allReviews.length}`);
    return { allReviews, positiveCount, negativeCount, neutralCount };
  } catch (error) {
    console.error('Fehler beim Laden oder Parsen der CSV-Daten:', error);
    throw new Error('CSV-Daten konnten nicht geladen werden');
  }
};

// Funktion zur Analyse der häufigsten Themen
const analyzeThemes = (comments) => {
  const stopWords = [
    "der", "die", "das", "und", "ist", "sind", "war", "für", "eine", "einer", "ein", "in", "zu", "mit", "auf", "es", "im", "den", "von", "nicht", "auch",
    "ein", "am", "an", "da", "so", "wie", "man", "aber", "wir", "ich", "sie", "er", "wir", "ihn", "ihm", "ja", "nein", "mal", "mehr", "als", "beim", "etwa", "oder", "noch"
  ];
  const themeCount = {};
  comments.forEach((comment) => {
    const words = comment.split(' ');
    words.forEach((word) => {
      const cleanedWord = word.toLowerCase().replace(/[^a-zäöüß]/gi, ''); // Bereinigen
      if (cleanedWord && !stopWords.includes(cleanedWord) && cleanedWord.length > 3) { // Längere Wörter bevorzugen
        if (!themeCount[cleanedWord]) {
          themeCount[cleanedWord] = 0;
        }
        themeCount[cleanedWord]++;
      }
    });
  });

  // Sortiere die Themen nach Häufigkeit
  const sortedThemes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]);
  return sortedThemes.slice(0, 5).map(([word, count]) => `${word} (${count} mal)`);
};

export default async function handler(req, res) {
  try {
    const { query, conversationHistory } = req.body;

    // Initialisiere conversationHistory, falls es nicht vorhanden ist
    const updatedConversationHistory = Array.isArray(conversationHistory) ? conversationHistory : [];

    // Überprüfe, ob query vorhanden ist
    if (typeof query !== 'string' || query.trim() === '') {
      console.error('Fehlende oder ungültige query im Request:', query);
      return res.status(400).json({ error: 'Fehlende oder ungültige query im Request' });
    }

    // Lade und analysiere die CSV-Daten
    let allReviews, positiveCount, negativeCount, neutralCount;
    try {
      ({ allReviews, positiveCount, negativeCount, neutralCount } = loadCsvData());
    } catch (error) {
      console.error('Fehler beim Laden der CSV-Daten:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der CSV-Daten' });
    }

    // Prüfe, ob die Anfrage nach spezifischen Kommentaren oder Details fragt
    let responseText;
    if (query.toLowerCase().includes('anzahl negativer') || query.toLowerCase().includes('wie viele negative')) {
      responseText = `Es gibt insgesamt ${negativeCount} negative Bewertungen.`;
    } else if (query.toLowerCase().includes('negative kommentare')) {
      const negativeComments = allReviews.filter(review => review.sentiment === 'negativ').map(review => review.review);
      responseText = `Hier sind einige der negativen Bewertungen:

${negativeComments.slice(0, 5).map((comment, index) => `${index + 1}. ${comment}`).join('\n\n')}`;
    } else if (query.toLowerCase().includes('positive kommentare')) {
      const positiveComments = allReviews.filter(review => review.sentiment === 'positiv').map(review => review.review);
      responseText = `Hier sind einige der positiven Bewertungen:

${positiveComments.slice(0, 5).map((comment, index) => `${index + 1}. ${comment}`).join('\n\n')}`;
    } else if (query.toLowerCase().includes('wie viele positive') || query.toLowerCase().includes('anzahl positiver')) {
      responseText = `Es gibt insgesamt ${positiveCount} positive Bewertungen.`;
    } else if (query.toLowerCase().includes('wie viele neutrale') || query.toLowerCase().includes('anzahl neutraler')) {
      responseText = `Es gibt insgesamt ${neutralCount} neutrale Bewertungen.`;
    } else if (query.toLowerCase().includes('was wird negativ bewertet')) {
      // Analysiere die negativen Bewertungen und fasse zusammen, was häufig bemängelt wird
      const negativeComments = allReviews.filter(review => review.sentiment === 'negativ').map(comment => comment.review);
      const negativeThemes = analyzeThemes(negativeComments);
      responseText = `Die häufigsten Kritikpunkte aus den negativen Bewertungen sind:

${negativeThemes.map((theme, index) => `${index + 1}. ${theme}`).join('\n')}`;
    } else if (query.toLowerCase().includes('was wird positiv bewertet')) {
      // Analysiere die positiven Bewertungen und fasse zusammen, was häufig gelobt wird
      const positiveComments = allReviews.filter(review => review.sentiment === 'positiv').map(comment => comment.review);
      const positiveThemes = analyzeThemes(positiveComments);
      responseText = `Die häufigsten positiven Aspekte aus den Bewertungen sind:

${positiveThemes.map((theme, index) => `${index + 1}. ${theme}`).join('\n')}`;
    } else {
      // Wenn die Anfrage allgemeiner Natur ist, den Verlauf mit einbinden
      const prompt = `
        Du bist der BewertungsBot und kennst alle Nutzerbewertungen. Deine Aufgabe ist es, die folgenden Bewertungen zu analysieren.
        
        Hier sind einige Bewertungen:
        ${allReviews.map(review => `- ${review.review} (${review.sentiment})`).join('\n')}
        
        Benutzer: "${query}"
        BewertungsBot:
      `;

      // Sende den angepassten Prompt an GPT
      try {
        responseText = await fetchChatGPTResponse(prompt);
      } catch (error) {
        console.error('Fehler beim Abrufen der GPT-Antwort:', error.response ? error.response.data : error.message);
        return res.status(500).json({ error: 'Fehler bei der Verarbeitung der Anfrage' });
      }
    }

    // Füge die aktuelle Frage und Antwort dem Verlauf hinzu
    updatedConversationHistory.push({ question: query, answer: responseText.trim() });

    res.status(200).json({ response: responseText.trim(), conversationHistory: updatedConversationHistory });
  } catch (error) {
    console.error('Allgemeiner Fehler im Handler:', error);
    res.status(500).json({ error: 'Fehler bei der Verarbeitung der Anfrage' });
  }
}