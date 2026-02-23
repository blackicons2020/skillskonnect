
import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { apiService } from '../services/apiService';
import { PaperAirplaneIcon, UserIcon, ChatBubbleLeftRightIcon } from './icons';

interface ChatInterfaceProps {
    currentUser: User;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentUser }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChats();
        const interval = setInterval(loadChats, 5000); // Poll for new chats/updates every 5s
        return () => clearInterval(interval);
    }, [currentUser.id]);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);
            const interval = setInterval(() => loadMessages(selectedChat.id), 3000); // Poll for new messages every 3s
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadChats = async () => {
        const userChats = await apiService.getChats(currentUser.id);
        setChats(userChats);
        setLoading(false);
    };

    const loadMessages = async (chatId: string) => {
        const msgs = await apiService.getChatMessages(chatId);
        setMessages(msgs);
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getOtherParticipantName = (chat: Chat) => {
        const otherId = chat.participants.find(p => p !== currentUser.id);
        return otherId ? chat.participantNames[otherId] : 'Unknown User';
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
        <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
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
                                    onClick={() => setSelectedChat(chat)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${selectedChat?.id === chat.id ? 'bg-white border-l-4 border-l-primary shadow-sm' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900">{getOtherParticipantName(chat)}</h3>
                                        {chat.lastMessage && (
                                            <span className="text-xs text-gray-400">{formatTime(chat.lastMessage.timestamp)}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate mt-1">
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
                        </div>

                        <div className="flex-grow p-4 overflow-y-auto bg-gray-50 space-y-4">
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

                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className="bg-primary text-white p-3 rounded-lg hover:bg-secondary disabled:bg-gray-300 transition-colors"
                                    title="Send message"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
                                </button>
                            </form>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                💾 Messages are automatically saved
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
                        <ChatBubbleLeftRightIcon className="w-16 h-16 mb-4 text-gray-200"/>
                        <p className="text-lg font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};
