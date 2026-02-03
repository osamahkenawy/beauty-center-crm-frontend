import { useState, useRef, useEffect, useContext } from 'react';
import { 
  Sparks, Send, Refresh, ArrowLeft, Trash, 
  LightBulb, StatsUpSquare, Calendar, User, Building,
  Flash, Wallet, ArrowRight, Copy, Check
} from 'iconoir-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import api from '../lib/api';
import './TrasealaAI.css';

export default function TrasealaAI() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Set document direction for RTL
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', {
        message: currentInput,
        conversationHistory: conversationHistory
      });

      if (response.success) {
        const aiData = response.data;
        
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: currentInput },
          { role: 'assistant', content: aiData.response }
        ].slice(-10));

        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: aiData.response,
          actions: aiData.actions || [],
          isGPT: !aiData.fallback,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I'm sorry, I encountered an error. Please try again.",
        actions: [],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setConversationHistory([]);
  };

  const handleQuickPrompt = (prompt) => {
    setInputValue(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatMessage = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('• ')) {
            return <span key={j} className="tai-bullet">{part}</span>;
          }
          return part;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const quickPrompts = [
    { 
      icon: <StatsUpSquare width={18} height={18} />, 
      label: isRTL ? 'نظرة عامة على المبيعات' : 'Sales Overview', 
      prompt: isRTL ? 'أعطني نظرة شاملة على المبيعات بما في ذلك العملاء المحتملين والصفقات والإيرادات' : 'Give me a complete sales overview including leads, deals, and revenue' 
    },
    { 
      icon: <Flash width={18} height={18} />, 
      label: isRTL ? 'العملاء المحتملين الساخنين' : 'Hot Leads', 
      prompt: isRTL ? 'أظهر لي العملاء المحتملين الأكثر أهمية' : 'Show me my hottest leads that need attention' 
    },
    { 
      icon: <Calendar width={18} height={18} />, 
      label: isRTL ? 'مهام اليوم' : 'Today\'s Tasks', 
      prompt: isRTL ? 'ما هي الأنشطة المستحقة اليوم وما المتأخر؟' : 'What activities do I have due today and what\'s overdue?' 
    },
    { 
      icon: <Building width={18} height={18} />, 
      label: isRTL ? 'أفضل الحسابات' : 'Top Accounts', 
      prompt: isRTL ? 'من هم أفضل الحسابات أداءً؟' : 'Who are my top performing accounts?' 
    },
    { 
      icon: <Wallet width={18} height={18} />, 
      label: isRTL ? 'صحة خط الأنابيب' : 'Pipeline Health', 
      prompt: isRTL ? 'حلل صحة خط الأنابيب ومراحل الصفقات' : 'Analyze my pipeline health and deal stages' 
    },
    { 
      icon: <LightBulb width={18} height={18} />, 
      label: isRTL ? 'اقتراحات' : 'Suggestions', 
      prompt: isRTL ? 'أعطني اقتراحات عملية لتحسين أداء مبيعاتي' : 'Give me actionable suggestions to improve my sales performance' 
    },
  ];

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`tai-container ${isRTL ? 'rtl' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Animated Background */}
      <div className="tai-bg">
        <div className="tai-gradient-orb tai-orb-1"></div>
        <div className="tai-gradient-orb tai-orb-2"></div>
        <div className="tai-gradient-orb tai-orb-3"></div>
        <div className="tai-grid"></div>
      </div>

      {/* Header */}
      <header className="tai-header">
        <div className="tai-header-left">
          <button className="tai-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft width={20} height={20} />
          </button>
          {/* <div className="tai-logo">
            <img 
              src="/assets/images/logos/TRASEALLA._WHITE_LOGOsvg.svg" 
              alt="Trasealla" 
              className="tai-logo-img"
            />
          </div> */}
        </div>
        <div className="tai-header-right">
          <button className="tai-clear-btn" onClick={handleClearChat} title={isRTL ? 'مسح المحادثة' : 'Clear conversation'}>
            <Trash width={18} height={18} />
            <span>{isRTL ? 'مسح' : 'Clear'}</span>
          </button>
          <Link to="/dashboard" className="tai-dashboard-link">
            <span>{isRTL ? 'لوحة التحكم' : 'Dashboard'}</span>
            <ArrowRight width={18} height={18} />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="tai-main">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="tai-welcome">
            <div className="tai-welcome-icon">
              <Sparks width={48} height={48} />
            </div>
            <h2>{isRTL ? 'مرحباً بك في Mwasalat AI' : 'Welcome to Mwasalat AI'}</h2>
            <p>{isRTL ? 'مساعدك الذكي لإدارة علاقات العملاء. اسألني أي شيء عن العملاء المحتملين والصفقات والأنشطة والمزيد.' : 'Your intelligent CRM assistant. Ask me anything about your leads, deals, activities, and more.'}</p>
            
            <div className="tai-prompts-grid">
              {quickPrompts.map((item, idx) => (
                <button 
                  key={idx}
                  className="tai-prompt-card"
                  onClick={() => handleQuickPrompt(item.prompt)}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="tai-prompt-icon">{item.icon}</div>
                  <span>{item.label}</span>
                  <ArrowRight width={16} height={16} className="tai-prompt-arrow" />
                </button>
              ))}
            </div>

            <div className="tai-tips">
              <LightBulb width={16} height={16} />
              <span>{isRTL ? 'نصيحة: يمكنك طرح أسئلة متابعة للحصول على مزيد من التفاصيل' : 'Tip: You can ask follow-up questions for more details'}</span>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="tai-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`tai-message ${message.type}`}
              >
                {message.type === 'bot' && (
                  <div className="tai-message-avatar">
                    <Sparks width={20} height={20} />
                  </div>
                )}
                <div className="tai-message-content">
                  <div className="tai-message-bubble">
                    {formatMessage(message.text)}
                  </div>
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="tai-message-actions">
                      {message.actions.map((action, idx) => (
                        <Link 
                          key={idx} 
                          to={action.path || action.link || '#'} 
                          className="tai-action-btn"
                        >
                          {action.label}
                          <ArrowRight width={14} height={14} />
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  <div className="tai-message-meta">
                    <span className="tai-message-time">{formatTime(message.timestamp)}</span>
                    {message.type === 'bot' && (
                      <button 
                        className="tai-copy-btn"
                        onClick={() => copyToClipboard(message.text, message.id)}
                        title="Copy response"
                      >
                        {copiedId === message.id ? (
                          <><Check width={14} height={14} /> {isRTL ? 'تم النسخ' : 'Copied'}</>
                        ) : (
                          <><Copy width={14} height={14} /> {isRTL ? 'نسخ' : 'Copy'}</>
                        )}
                      </button>
                    )}
                    {message.isGPT && (
                      <span className="tai-gpt-badge">
                        <Sparks width={12} height={12} /> GPT
                      </span>
                    )}
                  </div>
                </div>
                {message.type === 'user' && (
                  <div className="tai-user-avatar">
                    <User width={20} height={20} />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="tai-message bot">
                <div className="tai-message-avatar">
                  <Sparks width={20} height={20} />
                </div>
                <div className="tai-message-content">
                  <div className="tai-typing">
                    <div className="tai-typing-sparkles">
                      <Sparks className="tai-sparkle-1" width={16} height={16} />
                      <Sparks className="tai-sparkle-2" width={16} height={16} />
                      <Sparks className="tai-sparkle-3" width={16} height={16} />
                    </div>
                    <div className="tai-typing-text">
                      <span className="tai-typing-dot">.</span>
                      <span className="tai-typing-dot">.</span>
                      <span className="tai-typing-dot">.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="tai-footer">
        <div className="tai-input-wrapper">
          <div className="tai-input-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={isRTL ? 'اسأل Mwasalat AI أي شيء...' : 'Ask Mwasalat AI anything...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
              className="tai-input"
            />
            <button 
              className="tai-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send width={20} height={20} />
            </button>
          </div>
          <p className="tai-disclaimer">
            {isRTL ? 'يستخدم Mwasalat AI الذكاء الاصطناعي لتقديم رؤى ذكية بناءً على بيانات CRM الخاصة بك.' : 'Mwasalat AI uses artificial intelligence to provide intelligent insights based on your CRM data.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
