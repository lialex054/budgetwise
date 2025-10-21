// frontend/src/Chat.jsx

import React, { useState } from 'react';
import apiClient from './api'; // API helper

function Chat() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            content: "Hello! I'm BudgetWise. Ask me where you have spent the most money."
        }
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Send the user's question to the backend
            const response = await apiClient.post('/chat', {
                question: input
            });

            // add AI response in chat
            const aiMessage = { role: "ai", content: response.data.response};
            setMessages(prev => [...prev, aiMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.role}`}>
                        <p>{msg.content}</p>
                    </div>
                ))}
                {isLoading && <div className="message ai">...<p>...</p></div>}
            </div>
            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me about your spending..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
}

export default Chat;