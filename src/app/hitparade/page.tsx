"use client";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Spinner-Styles in CSS
const Spinner = () => (
  <div className="flex justify-center">
    <div className="spinner border-4 border-t-4 border-blue-500 border-solid rounded-full w-8 h-8 animate-spin"></div>
  </div>
);

// Benutzer Icon (kann angepasst werden)
const UserIcon = () => (
  <svg stroke="none" fill="black" strokeWidth="0" viewBox="0 0 16 16" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"></path>
  </svg>
);

// Bot Icon (kann angepasst werden)
const BotIcon = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="20" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM12 8v4m0 4h.01"></path>
  </svg>
);

export default function ChatBot() {
  const [input, setInput] = useState<string>('');              
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]); 
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const userMessage = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post('/api/hitparade', { query: input });
      const botMessage = { role: 'bot', content: response.data.response };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Fehler beim Abrufen der Antwort', error);
    } finally {
      setLoading(false);
    }

    setInput('');  
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen">
      <div className="bg-white p-6 rounded-lg border border-[#e5e7eb] w-[440px] h-[634px] flex flex-col" style={{boxShadow: "0 0 #0000, 0 0 #0000, 0 1px 2px 0 rgb(0 0 0 / 0.05)"}}>
        
        {/* Heading */}
        <div className="flex flex-col space-y-1.5 pb-6">
          <h2 className="font-semibold text-lg tracking-tight">Hitparaden Bot</h2>
          <p className="text-sm text-[#6b7280] leading-3">Powered by NETNODE</p>
        </div>

        {/* Chat Container */}
        <div className="flex-grow overflow-y-auto pr-4" style={{ minWidth: "100%" }}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 my-4 text-gray-600 text-sm ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                <div className="rounded-full bg-gray-100 border p-1">
                  {/* Unterscheidung zwischen Benutzer- und Bot-Icon */}
                  {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                </div>
              </span>
              <p className="leading-relaxed">
                <span className="block font-bold text-gray-700">{msg.role === 'user' ? 'Ich' : 'HitBot'} </span>
                {msg.content}
              </p>
            </div>
          ))}
          {/* Dummy element to allow scrolling to the bottom */}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Input Box */}
        <div className="flex items-center pt-4">
          <form className="flex items-center justify-center w-full space-x-2" onSubmit={(e) => {e.preventDefault(); sendMessage();}}>
            <input
              className="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] text-[#030712]"
              placeholder="Stelle deine Hitparadefrage..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium text-[#f9fafb] bg-black hover:bg-[#111827E6] h-10 px-4 py-2"
              type="submit"
              disabled={loading}
            >
              Fragen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
