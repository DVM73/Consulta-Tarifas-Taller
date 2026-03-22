
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { getBotResponse, startNewChat } from '../services/geminiService';
import { WELCOME_MESSAGE } from '../constants';
import SendIcon from './icons/SendIcon';
import UserIcon from './icons/UserIcon';
import ChatIcon from './icons/ChatIcon';
import SparklesIcon from './icons/SparklesIcon';

interface ChatbotProps {
    contextData?: string; // Datos en formato texto/JSON para que la IA los analice
    initialMessage?: string; // Mensaje opcional para auto-enviar al abrir
}

const Chatbot: React.FC<ChatbotProps> = ({ contextData, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Inicializar el chat cuando se monta
  useEffect(() => {
      const initChat = async () => {
          await startNewChat();
          
          // Si es la primera vez, ponemos el mensaje de bienvenida
          if (!hasInitialized.current) {
              setMessages([
                  {
                      id: 'initial-bot-message',
                      text: WELCOME_MESSAGE,
                      sender: 'bot',
                      timestamp: Date.now(),
                  },
              ]);
              hasInitialized.current = true;
          }

          // Si hay un mensaje inicial automático (ej: "Analizar datos"), lo enviamos
          if (initialMessage && !isLoading) {
              handleAutoSend(initialMessage);
          }
      };
      initChat();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ya no depende de contextData

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAutoSend = async (text: string) => {
      const userMessage: Message = {
          id: `user-${Date.now()}`,
          text: text,
          sender: 'user',
          timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      try {
          // Búsqueda inteligente
          let relevantContext = "";
          if (contextData) {
              const data = JSON.parse(contextData);
              // Búsqueda por palabras clave en múltiples campos
              const keywords = text.toLowerCase().split(/\s+/).filter(k => k.length > 2);
              const relevantData = data.filter((item: any) => {
                  const itemText = `${item.referencia || ''} ${item.articulo || ''} ${item.familia || ''} ${item.seccion || ''}`.toLowerCase();
                  return keywords.length === 0 || keywords.some(k => itemText.includes(k));
              });

              if (relevantData.length > 0) {
                  relevantContext = JSON.stringify(relevantData.slice(0, 30));
              } else {
                  // Resumen si no hay coincidencias
                  const summary = {
                      totalArticulos: data.length,
                      familias: [...new Set(data.map((i: any) => i.familia))].filter(Boolean).slice(0, 10),
                      mensaje: "No hay coincidencias específicas para esta consulta. Por favor, informa al usuario sobre lo que hay disponible en general."
                  };
                  relevantContext = `RESUMEN DE BASE DE DATOS: ${JSON.stringify(summary)}`;
              }
          }
          
          const botResponseText = await getBotResponse(text, relevantContext);
          const botMessage: Message = {
              id: `bot-${Date.now()}`,
              text: botResponseText,
              sender: 'bot',
              timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
           console.error("Error en chat:", error);
           setMessages((prev) => [...prev, {
               id: `error-${Date.now()}`,
               text: "Lo siento, ha ocurrido un error al procesar tu mensaje.",
               sender: 'bot',
               timestamp: Date.now(),
           }]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Búsqueda inteligente
      let relevantContext = "";
      if (contextData) {
          const data = JSON.parse(contextData);
          const keywords = currentInput.toLowerCase().split(/\s+/).filter(k => k.length > 2);
          const relevantData = data.filter((item: any) => {
              const itemText = `${item.referencia || ''} ${item.articulo || ''} ${item.familia || ''} ${item.seccion || ''}`.toLowerCase();
              return keywords.length === 0 || keywords.some(k => itemText.includes(k));
          });

          if (relevantData.length > 0) {
              relevantContext = JSON.stringify(relevantData.slice(0, 30));
          } else {
              const summary = {
                  totalArticulos: data.length,
                  familias: [...new Set(data.map((i: any) => i.familia))].filter(Boolean).slice(0, 10),
                  mensaje: "No hay coincidencias específicas. Resume la base de datos disponible."
              };
              relevantContext = `RESUMEN DE BASE DE DATOS: ${JSON.stringify(summary)}`;
          }
      }

      const botResponseText = await getBotResponse(currentInput, relevantContext);
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: 'bot',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error en chat:", error);
      setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          text: "Lo siento, ha ocurrido un error al procesar tu mensaje.",
          sender: 'bot',
          timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                <ChatIcon className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3 rounded-lg shadow-sm text-sm leading-relaxed ${
                message.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-700 dark:text-gray-200 rounded-bl-none markdown-body'
              }`}
            >
              <p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200 flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <SparklesIcon className="w-5 h-5" />
              </div>
            <div className="p-3 rounded-lg bg-white dark:bg-gray-700 rounded-bl-none shadow-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta sobre los datos..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base dark:text-white"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ''}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform active:scale-95"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;