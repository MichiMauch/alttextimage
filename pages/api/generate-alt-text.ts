import type { NextApiRequest, NextApiResponse } from 'next';
import vision from '@google-cloud/vision';
import axios from 'axios';

const client = new vision.ImageAnnotatorClient({
  keyFilename: './config/google-vision.json',
});

const generateAltText = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { imageUrl, language }: { imageUrl: string; language: 'EN' | 'DE' | 'FR' | 'IT' } = req.body;

  if (!imageUrl || !language) {
    return res.status(400).json({ message: 'Image URL and language are required' });
  }

  try {
    // Verwende die Google Vision API, um Labels zu generieren
    const [result] = await client.labelDetection(imageUrl);
    const labels = result?.labelAnnotations?.map((label) => label.description).join(', ') || 'No description generated';

    // Bestimme die Sprache des Prompts
    const languagePrompt: { [key: string]: string } = {
      EN: 'in English',
      DE: 'auf Deutsch',
      FR: 'en Français',
      IT: 'in Italiano',
      RM: 'en Rumantsch', 
    };

    const promptLanguage = languagePrompt[language] || 'in English'; // Fallback auf Englisch

    // Standard-Prompt für alle Bilder
    let customPrompt = `Please generate a descriptive alt text ${promptLanguage}, combining the following elements into a coherent sentence: ${labels}. The description should be as detailed as possible, giving context to the objects in the image.`;

    // Wenn Labels auf Menschen hinweisen, erweitere den Prompt
    if (labels.toLowerCase().includes('person') || labels.toLowerCase().includes('people')) {
      customPrompt = `
      Please generate a descriptive alt text ${promptLanguage} for a photo with people. 
      The following aspects are important for me: 
      - Facial expression (e.g., whether the person is grim, relaxed, or serious)
      - Clothing (e.g., whether neat or casual, or whether it's formal attire like a suit and tie)
      - Estimated age (a rough guess is fine)
      - Gender
      - Background (e.g., landscape, city, room)
      Keep the description as concise as possible but provide the necessary details. 
      The facial expression is very important, and the clothing plays a role (whether the person is dressed casually, in beachwear, or formally). Also, note if the person is wearing accessories like sunglasses or a cap. The text should not exceed 200 characters.
      `;
    }

    // Logge die Labels und den Prompt
    console.log('Generated Labels for OpenAI:', labels);
    console.log('Custom Prompt for OpenAI:', customPrompt);

    // OpenAI API-Aufruf zur Generierung des Alt-Texts basierend auf den Labels
    const openAiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI that generates detailed and descriptive alt text for images.' },
          { role: 'user', content: customPrompt }
        ],
        max_tokens: 150,  // Erhöhung der Token-Anzahl für detaillierte Antworten
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`, // Dein OpenAI API-Schlüssel
          'Content-Type': 'application/json',
        },
      }
    );

    const altText = openAiResponse.data.choices?.[0]?.message?.content?.trim() || 'Unable to generate alt text';
    console.log('Generated Alt Text from OpenAI:', altText);

    // Rückgabe des von OpenAI generierten Alt-Texts
    res.status(200).json({ altText });
  } catch (error) {
    console.error('Error generating alt text:', error);
    res.status(500).json({ message: 'Error generating alt text', errorDetails: (error as Error).message });
  }
};

export default generateAltText;
