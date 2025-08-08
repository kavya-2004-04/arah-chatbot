import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "🤖 Welcome to ArahBot! 🚀\nAsk me anything about Arah Infotech: services, careers, or company details. How can I help you today?" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const handleUserInput = async () => {
    const input = userInput.trim();
    if (!input || isLoading) return;

    setMessages([...messages, { sender: "user", text: input }]);
    setUserInput("");
    setIsLoading(true);

    try {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });
    const data = await response.json();

    // Handle redirects
    if (data.redirect) {
      window.open(data.redirect, "_blank");
    }
 // Apply auto-corrections
    const correctedText = data.reply
      .replace(/anh/gi, "Arah")
      .replace(/opz@/gi, "ops@")
      .replace(/Arab/gi, "Arah");

    // Add bot message with correction highlights
    setMessages(prev => [
      ...prev,
      {
        sender: "bot",
        text: correctedText,
        isLink: data.redirect // Flag for styling
      }
    ]);
    // ===== END ADDITION ===== //
    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: "bot", 
        text: "Please email ops@arahinfotech.net for help." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatbot-container">
      <div className="chatbot-toggle-button" onClick={() => setIsOpen(!isOpen)}>
        💬
      </div>

      {isOpen && (
        <div className="chatbot-box">
          <div className="chatbot-header">
            <h3>Arah Chatbot</h3>
            <button onClick={() => setIsOpen(false)} className="chatbot-close">×</button>
          </div>
          
          <div className="chatbot-body">
            {messages.map((message, index) => (
              <div key={index} className={`chatbot-message ${message.sender}`}>
                {message.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line.includes('Visit our') || line.includes('See our') ? (
                      <span 
                        style={{ color: '#4a90e2', cursor: 'pointer' }}
                        onClick={() => window.location.href = line.includes('Services') ? '/services' : '/contact'}
                      >
                        {line}
                      </span>
                    ) : (
                      line
                    )}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message bot">
                <div className="chatbot-typing-indicator">
                  <span>●</span> <span>●</span> <span>●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-section">
            <input
              type="text"
              placeholder="Ask about services, careers, etc..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserInput()}
              disabled={isLoading}
            />
            <button 
              onClick={handleUserInput} 
              disabled={isLoading || !userInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;