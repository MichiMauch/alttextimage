"use client";
import { useState } from "react";
import axios from "axios";
import imageCompression from "browser-image-compression"; // Importiere die Bibliothek

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altTexts, setAltTexts] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [languages, setLanguages] = useState<string[]>([]); // Array für mehrere Sprachen
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Speichert die Bild-URL

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Optionen zur Komprimierung und Skalierung des Bildes
      const options = {
        maxSizeMB: 2, // Max. Größe in MB
        maxWidthOrHeight: 1024, // Max. Breite oder Höhe in Pixeln
        useWebWorker: true, // Verwende Web Worker zur Optimierung
      };

      try {
        // Komprimiere das Bild
        const compressedFile = await imageCompression(file, options);
        setSelectedFile(compressedFile); // Gespeicherte Datei für den Upload
      } catch (error) {
        console.error("Error during image compression:", error);
      }
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const language = e.target.value;
    if (e.target.checked) {
      setLanguages([...languages, language]); // Füge Sprache hinzu
    } else {
      setLanguages(languages.filter((lang) => lang !== language)); // Entferne Sprache
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || languages.length === 0) return; // Sicherstellen, dass Datei und Sprache gewählt wurden

    setUploading(true);
    try {
      // Upload the file to Cloudflare R2
      const formData = new FormData();
      formData.append("file", selectedFile);

      // API-Aufruf zur Verarbeitung des Uploads
      const { data } = await axios.post("/api/upload-to-r2", formData);
      const uploadedImageUrl = data.url;
      setImageUrl(uploadedImageUrl); // Bild-URL speichern

      // Generiere Alt-Texte für jede ausgewählte Sprache
      const altTextsResponses = await Promise.all(
        languages.map(async (lang) => {
          const response = await axios.post("/api/generate-alt-text", {
            imageUrl: uploadedImageUrl,
            language: lang, // Sprache übergeben
          });
          return { [lang]: response.data.altText };
        })
      );

      // Alt-Texte für alle Sprachen zusammenführen
      const combinedAltTexts = altTextsResponses.reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {}
      );
      setAltTexts(combinedAltTexts); // Alt-Texte speichern
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Upload an Image to Generate Alt Text</h1>

      {/* Datei-Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4 border border-gray-300 p-2 rounded"
      />

      {/* Sprachwahl Checkboxen */}
      <div className="mb-4">
        <label className="ml-4">
          <input
            type="checkbox"
            value="DE"
            onChange={handleLanguageChange}
            className="mr-2"
          />
          Deutsch
        </label>
        <label className="ml-4">
          <input
            type="checkbox"
            value="RM"
            onChange={handleLanguageChange}
            className="mr-2"
          />
          Rätoromanisch
        </label>
        <label>
          <input
            type="checkbox"
            value="EN"
            onChange={handleLanguageChange}
            className="mr-2"
          />
          English
        </label>
        <label className="ml-4">
          <input
            type="checkbox"
            value="FR"
            onChange={handleLanguageChange}
            className="mr-2"
          />
          Français
        </label>
        <label className="ml-4">
          <input
            type="checkbox"
            value="IT"
            onChange={handleLanguageChange}
            className="mr-2"
          />
          Italiano
        </label>
      </div>

      {/* Upload-Button */}
      <button
        onClick={handleUpload}
        className={`px-4 py-2 rounded text-white ${uploading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"}`}
        disabled={uploading || !selectedFile || languages.length === 0}
      >
        {uploading ? (
          <>
            <svg
              aria-hidden="true"
              role="status"
              className="inline w-4 h-4 mr-2 text-white animate-spin"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="#E5E7EB"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
              />
            </svg>
            Uploading...
          </>
        ) : (
          "Upload & Generate Alt Text"
        )}
      </button>

      {/* Generierter Alt-Text für jede Sprache */}
      {Object.keys(altTexts).length > 0 && (
        <div className="mt-6 p-4 border rounded bg-gray-50 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Generated Alt Texts:</h2>
          {Object.entries(altTexts).map(([lang, altText]) => (
            <div key={lang} className="mb-2">
              <strong>{lang}:</strong>
              <p>{altText}</p>
            </div>
          ))}
          {/* Bild unter den Alt-Texten anzeigen */}
          {imageUrl && (
            <div className="mt-4">
              <img src={imageUrl} alt="Uploaded" className="max-w-full h-auto" />
            </div>
          )}
        </div>
      )}
      
    </div>
  );
};

export default UploadPage;
