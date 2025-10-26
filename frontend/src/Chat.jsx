// frontend/src/Chat.jsx
import React, { useState } from 'react';
import apiClient from './api';
import ReactMarkdown from 'react-markdown'; // <-- Import react-markdown

// Import Chat UI Kit styles
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
// Import Chat UI Kit components
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';

function Chat() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: "Hello! I'm Felix. Ask me where you have spent the most money."
    }
  ]);

  const handleSubmit = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/chat/', {
        question: messageText
      });

      const aiMessage = { role: 'ai', content: response.data.response };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error communicating with chat API:", error);
      const errorMessage = { role: 'ai', content: "Sorry, I encountered an error. Please try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // --- CHANGE 1: Remove outer div, rely on Chatscope layout ---
    // The parent container in App.jsx (e.g., <div className="p-4 md:p-8">)
    // will now determine the chat component's size and position.
    // Give MainContainer height to fill its parent or a specific height.
    <MainContainer responsive style={{ height: '80vh' }}> {/* Example height */}
      <ChatContainer>
        <MessageList
          typingIndicator={isLoading ? <TypingIndicator content="Felix is thinking..." /> : null}
          // Scroll to bottom when new messages are added
          scrollBehavior="smooth"
        >
          {messages.map((msg, index) => (
            <Message
              key={index}
              model={{
                // Keep model for direction, sender, position
                sender: msg.role,
                direction: msg.role === 'user' ? 'outgoing' : 'incoming',
                position: 'single',
              }}
            >
              {/* --- CHANGE 2: Render content as children w/ Markdown --- */}
              {/* Use Message.HtmlContent for user messages (plain text) */}
              {/* Use ReactMarkdown for AI messages */}
              {msg.role === 'user' ? (
                 <Message.TextContent text={msg.content} />
               ) : (
                // Use custom content for markdown rendering
                <Message.CustomContent>
                  <ReactMarkdown
                    components={{
                      // Optional: Customize how elements like bold are rendered if needed
                      // strong: ({node, ...props}) => <strong style={{color: 'blue'}} {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </Message.CustomContent>
              )}
              {/* -------------------------------------------------------- */}
            </Message>
          ))}
        </MessageList>
        <MessageInput
          placeholder="Ask about your spending..."
          onSend={handleSubmit}
          attachButton={false}
          disabled={isLoading}
          // Automatically clear input after sending
          sendOnReturnDisabled={false} // Allow sending with Enter key
        />
      </ChatContainer>
    </MainContainer>
  );
}

export default Chat;