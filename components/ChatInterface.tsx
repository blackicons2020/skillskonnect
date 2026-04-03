
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { apiService } from '../services/apiService';
import { PaperAirplaneIcon, UserIcon, ChatBubbleLeftRightIcon } from './icons';

interface ChatInterfaceProps {
    currentUser: User;
    initialChatId?: string | null;
    onChatOpened?: () => void;
    onUnreadCountChange?: (count: number) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentUser, initialChatId, onChatOpened, onUnreadCountChange }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const prevMessageCountRef = useRef(0);
    const initialChatHandledRef = useRef(false);

    const handleMessagesScroll = () => {
        const el = messagesContainerRef.current;
        if (!el) return;
        isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    useEffect(() => {
        loadChats();
        const interval = setInterval(loadChats, 5000); // Poll for new chats/updates every 5s
        return () => clearInterval(interval);
    }, [currentUser.id]);

    // Auto-select chat when initialChatId is provided — only once, not on every poll
    useEffect(() => {
        if (initialChatId && chats.length > 0 && !initialChatHandledRef.current) {
            const chatToSelect = chats.find(c => c.id === initialChatId);
            if (chatToSelect) {
                initialChatHandledRef.current = true;
                handleSelectChat(chatToSelect);
                onChatOpened?.();
            }
        }
    }, [initialChatId, chats]);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);
            const interval = setInterval(() => loadMessages(selectedChat.id), 3000); // Poll for new messages every 3s
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        if (messages.length > prevMessageCountRef.current) {
            if (isAtBottomRef.current) {
                const isFirstLoad = prevMessageCountRef.current === 0;
                if (isFirstLoad) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
                } else {
                    scrollToBottom();
                }
            }
        }
        prevMessageCountRef.current = messages.length;
    }, [messages]);

    const loadChats = async () => {
        try {
            const userChats = await apiService.getChats(currentUser.id);
            const safeChats = Array.isArray(userChats) ? userChats : [];
            setChats(safeChats);
            // Report total unread count to parent
            const total = safeChats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            onUnreadCountChange?.(total);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const msgs = await apiService.getChatMessages(chatId);
            const safeMessages = Array.isArray(msgs) ? msgs : [];
            setMessages(prev => {
                // Only update state if messages actually changed to prevent layout jitter
                if (prev.length === safeMessages.length &&
                    (prev.length === 0 || prev[prev.length - 1]?.id === safeMessages[safeMessages.length - 1]?.id)) {
                    return prev;
                }
                return safeMessages;
            });
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChat || !newMessage.trim()) return;

        const text = newMessage;
        setNewMessage(''); // Optimistic clear

        try {
            await apiService.sendMessage(selectedChat.id, currentUser.id, text);
            await loadMessages(selectedChat.id); // Reload messages to show the new one
            loadChats(); // Update last message in sidebar
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(text); // Restore message on error
        }
    };

    const scrollToBottom = () => {
        if (isAtBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleSelectChat = async (chat: Chat) => {
        setSelectedChat(chat);
        setShowMenu(false);
        isAtBottomRef.current = true; // always scroll to bottom on chat open
        prevMessageCountRef.current = 0;
        // Mark messages in this chat as read
        try {
            await apiService.markChatAsRead(chat.id);
            // Update local unread count to zero for this chat
            setChats(prev => {
                const updated = prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c);
                const total = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                onUnreadCountChange?.(total);
                return updated;
            });
        } catch {
            // Non-critical
        }
    };

    const getOtherParticipantId = (chat: Chat) => {
        return chat.participants?.find(p => p !== currentUser.id) || null;
    };

    const handleBlockUser = async () => {
        if (!selectedChat) return;
        const otherId = getOtherParticipantId(selectedChat);
        if (!otherId) return;
        try {
            await apiService.blockUser(otherId);
            setChats(prev => prev.filter(c => c.id !== selectedChat.id));
            setSelectedChat(null);
            setShowBlockConfirm(false);
            setShowMenu(false);
            setActionFeedback('User blocked. The conversation has been removed.');
            setTimeout(() => setActionFeedback(null), 4000);
        } catch {
            setActionFeedback('Failed to block user. Please try again.');
            setTimeout(() => setActionFeedback(null), 4000);
        }
    };

    const handleReportUser = async () => {
        if (!selectedChat || !reportReason) return;
        const otherId = getOtherParticipantId(selectedChat);
        if (!otherId) return;
        try {
            await apiService.reportUser(otherId, reportReason, reportDetails);
            setShowReportDialog(false);
            setShowMenu(false);
            setReportReason('');
            setReportDetails('');
            setActionFeedback('Report submitted. Thank you for helping keep the community safe.');
            setTimeout(() => setActionFeedback(null), 5000);
        } catch {
            setActionFeedback('Failed to submit report. Please try again.');
            setTimeout(() => setActionFeedback(null), 4000);
        }
    };

    const getOtherParticipantName = (chat: Chat) => {
        const otherId = chat.participants?.find(p => p !== currentUser.id);
        if (!otherId) return 'Unknown User';
        if (chat.participantNames && typeof chat.participantNames === 'object') {
            return chat.participantNames[otherId] || 'Unknown User';
        }
        return 'Unknown User';
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-gray-500">Loading messages...</div>;
    }

    return (
        <div className="flex bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200" style={{ height: 'min(600px, calc(100dvh - 200px))' }}>
            {/* Sidebar / Chat List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary"/>
                        Messages
                    </h2>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {chats.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No conversations yet.</p>
                        </div>
                    ) : (
                        <ul>
                            {chats.map(chat => (
                                <li 
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${selectedChat?.id === chat.id ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-semibold ${chat.unreadCount && chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{getOtherParticipantName(chat)}</h3>
                                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                            {chat.lastMessage && (
                                                <span className="text-xs text-gray-400">{formatTime(chat.lastMessage.timestamp)}</span>
                                            )}
                                            {chat.unreadCount && chat.unreadCount > 0 ? (
                                                <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <p className={`text-sm truncate mt-1 ${chat.unreadCount && chat.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                                        {chat.lastMessage ? (
                                            <span>
                                                {chat.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                                                {chat.lastMessage.text}
                                            </span>
                                        ) : (
                                            <span className="italic text-gray-400">No messages yet</span>
                                        )}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`w-full md:w-2/3 flex flex-col bg-white ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSelectedChat(null)}>
                                    &larr; Back
                                </button>
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <UserIcon className="w-5 h-5 text-primary"/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{getOtherParticipantName(selectedChat)}</h3>
                                    {messages.length > 0 && (
                                        <p className="text-xs text-gray-500">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
                                    )}
                                </div>
                            </div>
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(v => !v)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="More options"
                                    aria-label="More options"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-44">
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReportDialog(true); }}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            Report User
                                        </button>
                                        <button
                                            onClick={() => { setShowMenu(false); setShowBlockConfirm(true); }}
                                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                            </svg>
                                            Block User
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow p-4 overflow-y-auto bg-gray-50 space-y-4" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <p className="text-center">
                                        <span className="block text-4xl mb-2">💬</span>
                                        <span className="text-sm">No messages yet.<br/>Start the conversation!</span>
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.senderId === currentUser.id;
                                    const prevMsg = index > 0 ? messages[index - 1] : null;
                                    const showDateSeparator = prevMsg && 
                                        new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
                                    
                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDateSeparator && (
                                                <div className="flex items-center gap-2 my-4">
                                                    <div className="flex-1 border-t border-gray-300"></div>
                                                    <span className="text-xs text-gray-500 font-medium px-2">
                                                        {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <div className="flex-1 border-t border-gray-300"></div>
                                                </div>
                                            )}
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                                        {formatTime(msg.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className="bg-primary text-white px-4 py-3 rounded-lg hover:bg-secondary disabled:bg-gray-300 transition-colors flex items-center gap-1.5 flex-shrink-0"
                                    title="Send message"
                                    aria-label="Send"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
                                    <span className="text-sm font-semibold hidden sm:inline">Send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
                        <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-gray-200"/>
                        <p className="text-lg font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>

            {/* Feedback toast */}
            {actionFeedback && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-5 py-3 rounded-full shadow-lg z-50 max-w-sm text-center">
                    {actionFeedback}
                </div>
            )}

            {/* Block confirmation modal */}
            {showBlockConfirm && selectedChat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Block {getOtherParticipantName(selectedChat)}?</h3>
                        <p className="text-sm text-gray-600 mb-6">This user will no longer be able to message you and this conversation will be removed from your inbox.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBlockConfirm(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBlockUser}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                            >
                                Block User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report dialog */}
            {showReportDialog && selectedChat && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Report {getOtherParticipantName(selectedChat)}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                            <select
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select a reason</option>
                                <option value="spam">Spam</option>
                                <option value="harassment">Harassment or bullying</option>
                                <option value="inappropriate">Inappropriate content</option>
                                <option value="scam">Scam or fraud</option>
                                <option value="fake">Fake profile</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Additional details (optional)</label>
                            <textarea
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Describe the issue..."
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowReportDialog(false); setReportReason(''); setReportDetails(''); }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportUser}
                                disabled={!reportReason}
                                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300"
                            >
                                Submit Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
