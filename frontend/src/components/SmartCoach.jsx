import React, { useState, useRef, useEffect } from 'react';

function SmartCoach({ profileData, planResult }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Hi! I am your Smart Coach. Ask me anything about your diet plan.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build context
    const constraints = [profileData.dietary_goal, profileData.dietary_type, profileData.dietary_restrictions].filter(Boolean).join(', ');
    const context = `
      Calorie Goal: ${planResult.nutrition.target_calories} kcal
      Constraints: ${constraints}
      Day 1 Plan Context: ${JSON.stringify(planResult.meal_plan[0])}
    `;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: context
        })
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();
      
      setMessages([...newMessages, { role: 'model', text: data.response }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'model', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        Smart Coach
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg msg-${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="chat-msg msg-model" style={{opacity: 0.5}}>
            Typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          className="chat-input" 
          placeholder="Ask a question..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="chat-send" disabled={loading || !input.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

export default SmartCoach;
