import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Inbox as InboxIcon, Send, Star, Check, Clock, User, MessageSquare, Mail, Phone, Search, Filter, MoreVertical } from 'lucide-react';
import './CRMPages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('crm_token');
      const params = new URLSearchParams();
      if (filter) params.append('status', filter);
      
      const res = await fetch(`${API_URL}/inbox/conversations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConversations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      setLoadingMessages(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/inbox/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedConversation(data.data);
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const seedDemoData = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/inbox/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Demo data loaded');
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to seed data:', error);
    }
  }, [fetchConversations, showToast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/inbox/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: selectedConversation.id, content: newMessage })
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages(selectedConversation.id);
      } else {
        showToast('error', data.message);
      }
    } catch (error) {
      showToast('error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (type) => {
    const icons = { email: <Mail size={16} />, whatsapp: <MessageSquare size={16} />, live_chat: <MessageSquare size={16} />, sms: <Phone size={16} /> };
    return icons[type] || <MessageSquare size={16} />;
  };

  const getStatusColor = (status) => {
    const colors = { open: '#f59e0b', pending: '#6b7280', resolved: '#10b981', closed: '#374151' };
    return colors[status] || '#6b7280';
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="crm-page inbox-page">
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <span>!</span>}
          {toast.message}
        </div>
      )}

      <div className="inbox-container">
        {/* Sidebar */}
        <div className="inbox-sidebar">
          <div className="inbox-sidebar-header">
            <h2>Inbox</h2>
            <button className="btn-sm" onClick={seedDemoData} title="Load demo data">Demo</button>
          </div>
          
          <div className="inbox-filters">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-control">
              <option value="">All Conversations</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : conversations.length === 0 ? (
            <div className="empty-conversations">
              <InboxIcon size={32} />
              <p>No conversations</p>
              <button className="btn-sm" onClick={seedDemoData}>Load Demo Data</button>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => fetchMessages(conv.id)}
                >
                  <div className="conv-avatar" style={{ background: conv.channel_color || '#667eea' }}>
                    {getChannelIcon(conv.channel_type)}
                  </div>
                  <div className="conv-content">
                    <div className="conv-header">
                      <span className="conv-name">{conv.customer_name || conv.customer_email || 'Unknown'}</span>
                      <span className="conv-time">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="conv-preview">{conv.last_message || 'No messages'}</div>
                    <div className="conv-meta">
                      <span className="conv-status" style={{ color: getStatusColor(conv.status) }}>{conv.status}</span>
                      {conv.unread_count > 0 && <span className="unread-badge">{conv.unread_count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="inbox-main">
          {!selectedConversation ? (
            <div className="no-conversation">
              <InboxIcon size={64} />
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list to view messages</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-info">
                  <div className="chat-avatar" style={{ background: selectedConversation.channel_color || '#667eea' }}>
                    {getChannelIcon(selectedConversation.channel_type)}
                  </div>
                  <div>
                    <h3>{selectedConversation.customer_name || 'Unknown Customer'}</h3>
                    <span className="chat-channel">{selectedConversation.channel_name || selectedConversation.channel_type}</span>
                  </div>
                </div>
                <div className="chat-actions">
                  <span className="status-badge" style={{ background: getStatusColor(selectedConversation.status) }}>
                    {selectedConversation.status}
                  </span>
                </div>
              </div>

              <div className="chat-messages">
                {loadingMessages ? (
                  <div className="loading-spinner"><div className="spinner"></div></div>
                ) : messages.length === 0 ? (
                  <div className="no-messages">No messages in this conversation</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender_type}`}>
                      <div className="message-content">
                        {msg.content}
                        <div className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {msg.sender_type === 'agent' && <span className="agent-name"> • {msg.agent_name || 'Agent'}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="chat-input" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .inbox-page { padding: 0 !important; height: calc(100vh - 140px); }
        .inbox-container { display: flex; height: 100%; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .inbox-sidebar { width: 350px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; flex-shrink: 0; }
        .inbox-sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .inbox-sidebar-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
        .btn-sm { padding: 6px 12px; font-size: 12px; background: #244066; color: white; border: none; border-radius: 6px; cursor: pointer; }
        .inbox-filters { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
        .inbox-filters .form-control { width: 100%; padding: 8px 12px; font-size: 13px; }
        .conversation-list { flex: 1; overflow-y: auto; }
        .conversation-item { display: flex; gap: 12px; padding: 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; transition: background 0.2s; }
        .conversation-item:hover { background: #f8f9fb; }
        .conversation-item.active { background: #eef2ff; }
        .conv-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .conv-content { flex: 1; min-width: 0; }
        .conv-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .conv-name { font-weight: 600; color: #1a1a2e; font-size: 14px; }
        .conv-time { font-size: 11px; color: #9ca3af; }
        .conv-preview { font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
        .conv-status { font-size: 11px; font-weight: 600; text-transform: capitalize; }
        .unread-badge { background: #f2421b; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
        .empty-conversations { text-align: center; padding: 40px 20px; color: #6b7280; }
        .empty-conversations p { margin: 12px 0; }
        .inbox-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .no-conversation { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; text-align: center; }
        .no-conversation h3 { margin: 16px 0 8px; color: #374151; }
        .chat-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
        .chat-info { display: flex; align-items: center; gap: 12px; }
        .chat-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; }
        .chat-info h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .chat-channel { font-size: 12px; color: #6b7280; text-transform: capitalize; }
        .status-badge { padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; color: white; text-transform: capitalize; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #f8f9fb; }
        .no-messages { text-align: center; color: #9ca3af; padding: 40px; }
        .message { display: flex; }
        .message.customer { justify-content: flex-start; }
        .message.agent, .message.system { justify-content: flex-end; }
        .message-content { max-width: 70%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.5; }
        .message.customer .message-content { background: white; border-bottom-left-radius: 4px; }
        .message.agent .message-content { background: #244066; color: white; border-bottom-right-radius: 4px; }
        .message-time { font-size: 11px; opacity: 0.7; margin-top: 6px; }
        .agent-name { opacity: 0.8; }
        .chat-input { display: flex; gap: 12px; padding: 16px 24px; border-top: 1px solid #e5e7eb; }
        .chat-input input { flex: 1; padding: 14px 18px; border: 2px solid #e5e7eb; border-radius: 24px; font-size: 14px; }
        .chat-input input:focus { outline: none; border-color: #244066; }
        .chat-input button { width: 48px; height: 48px; background: #244066; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 768px) {
          .inbox-sidebar { width: 100%; position: absolute; z-index: 10; height: 100%; }
          .inbox-main { display: none; }
          .inbox-container.has-selected .inbox-sidebar { display: none; }
          .inbox-container.has-selected .inbox-main { display: flex; }
        }
      `}</style>
    </div>
  );
}

