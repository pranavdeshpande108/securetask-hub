import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Users, 
  Paperclip, 
  X, 
  FileIcon, 
  Image as ImageIcon,
  Moon,
  Sun,
  LogOut,
  Home,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const Chat = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    messages,
    chatUsers,
    selectedUser,
    setSelectedUser,
    sendMessage,
    loading,
    uploading,
    totalUnread,
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    await sendMessage(newMessage, selectedFile || undefined);
    setNewMessage('');
    setSelectedFile(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const selectedUserData = chatUsers.find((u) => u.id === selectedUser);

  const isImageFile = (type: string | null | undefined) => {
    return type?.startsWith('image/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {totalUnread}
                </Badge>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
          {/* Users Sidebar */}
          <div className="md:col-span-1 bg-card rounded-2xl border shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Conversations
              </h2>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-1">
                {chatUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No users available</p>
                  </div>
                ) : (
                  chatUsers.map((chatUser) => (
                    <button
                      key={chatUser.id}
                      onClick={() => setSelectedUser(chatUser.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        selectedUser === chatUser.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Avatar className={`h-10 w-10 border-2 ${
                        selectedUser === chatUser.id 
                          ? 'border-primary-foreground/30' 
                          : 'border-primary/20'
                      }`}>
                        <AvatarFallback className={`font-semibold ${
                          selectedUser === chatUser.id 
                            ? 'bg-primary-foreground/20 text-primary-foreground' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {getInitials(chatUser.full_name, chatUser.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate">
                          {chatUser.full_name || chatUser.email}
                        </div>
                        <div className={`text-xs truncate ${
                          selectedUser === chatUser.id 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {chatUser.email}
                        </div>
                      </div>
                      {chatUser.unread_count > 0 && (
                        <Badge 
                          variant={selectedUser === chatUser.id ? 'secondary' : 'destructive'} 
                          className="rounded-full"
                        >
                          {chatUser.unread_count}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 bg-card rounded-2xl border shadow-lg flex flex-col overflow-hidden">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {selectedUserData && getInitials(selectedUserData.full_name, selectedUserData.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">
                      {selectedUserData?.full_name || selectedUserData?.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUserData?.email}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">Loading messages...</p>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              {msg.file_url && (
                                <div className="mb-2">
                                  {isImageFile(msg.file_type) ? (
                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={msg.file_url}
                                        alt={msg.file_name || 'Image'}
                                        className="max-w-full rounded-lg max-h-60 object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={msg.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 p-2 rounded-lg ${
                                        isOwn ? 'bg-primary-foreground/10' : 'bg-background'
                                      }`}
                                    >
                                      <FileIcon className="h-5 w-5 shrink-0" />
                                      <span className="text-sm truncate">{msg.file_name}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              {msg.message && !msg.message.startsWith('Sent a file:') && (
                                <p className="text-sm break-words">{msg.message}</p>
                              )}
                              <p
                                className={`text-xs mt-1 ${
                                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-muted/30">
                  {selectedFile && (
                    <div className="mb-3 flex items-center gap-2 p-2 bg-muted rounded-lg">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-primary shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full bg-background"
                      disabled={uploading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!newMessage.trim() && !selectedFile) || uploading}
                      size="icon"
                      className="rounded-full shrink-0"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-1">Select a conversation</h3>
                  <p className="text-sm">Choose a user from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
