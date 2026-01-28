// "use client";

// import { useEffect } from 'react';

// export default function ChatbotN8N() {
//   useEffect(() => {
//     // 1. SIN espacios, SIN barra al final
//     const webhookUrl = "https://proyectomedico.app.n8n.cloud/webhook/3f911cd7-0867-46f9-b7ca-84b5b8b30b7e/chat";

//     const scriptId = 'n8n-chat-script-v2'; // cambia para forzar reload

//     if (document.getElementById(scriptId)) return;

//     const script = document.createElement('script');
//     script.id = scriptId;
//     script.type = 'module';

//     script.innerHTML = `
//       import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

//       if (!document.querySelector('.n8n-chat-widget-container')) {
//         createChat({
//           webhookUrl: '${webhookUrl}',
//           theme: {
//             '--chat-color-primary': '#007bff',
//             '--chat-border-radius': '12px',
//             '--chat-font-family': 'Roboto, sans-serif'
//           }
//         });
//       }
//     `;

//     document.body.appendChild(script);
//   }, []);

//   return null;
// }

"use client";

import { useEffect } from 'react';

export default function ChatbotN8N() {
  useEffect(() => {
    // 1. SIN espacios, SIN barra al final
    const webhookUrl = "https://proyectomedico.app.n8n.cloud/webhook/3f911cd7-0867-46f9-b7ca-84b5b8b30b7e/chat";

    const scriptId = 'n8n-chat-script-v2';

    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'module';

    script.innerHTML = `
      import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

      if (!document.querySelector('.n8n-chat-widget-container')) {
        createChat({
          webhookUrl: '${webhookUrl}',
          
          // 1. TÍTULO Y LOGO
          i18n: {
            en: {
              // Aquí ponemos el Logo (Emoji) + El Nombre
              title: '🏥 Asistente Hospital Central', 
              subtitle: 'Horario de atención: 24 Horas',
              getStarted: 'Iniciar Consulta',
              inputPlaceholder: 'Escribe tu mensaje...',
            }
          },

          // 2. MENSAJE DE BIENVENIDA
          initialMessages: [
            "¡Hola! 👋 Soy el asistente virtual del Hospital Central. ¿Te gustaría agendar una cita o consultar disponibilidad?"
          ],

          // 3. DISEÑO LILA (Personalizado)
          theme: {
            // --- COLOR PRINCIPAL (Burbuja del paciente y Botón enviar) ---
            // Un tono lila vibrante pero legible
            '--chat-color-primary': '#9b59b6', 

            // --- COLOR SECUNDARIO (Burbuja del asistente) ---
            // Un gris muy suave para que contraste bien
            '--chat-color-secondary': '#f3e5f5', 
            
            // --- CABECERA (Donde dice el Título) ---
            // Un lila un poco más oscuro para dar seriedad
            '--chat-header-background-color': '#8e44ad', 
            
            // Texto de la cabecera en blanco
            '--chat-header-text-color': '#ffffff',

            // Ajustes de forma
            '--chat-border-radius': '15px', // Bordes más redondeados
            '--chat-window-width': '380px',
            '--chat-font-family': 'Arial, Helvetica, sans-serif'
          }
        });
      }
    `;

    document.body.appendChild(script);
  }, []);

  return null;
}