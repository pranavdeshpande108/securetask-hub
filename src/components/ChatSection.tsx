import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, ArrowLeft, Users, ExternalLink, Paperclip, X, FileIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const ChatSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    <Card className="w-full h-[500px] flex flex-col overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            {selectedUser ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 h-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="truncate max-w-[120px]">{selectedUserData?.full_name || selectedUserData?.email}</span>
              </div>
            ) : (
              'Messages'
            )}
          </div>
          <div className="flex items-center gap-2">
            {!selectedUser && totalUnread > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {totalUnread}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chat')}
              className="text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Full View
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {!selectedUser ? (
          // User List
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-2">
              {chatUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No users available to chat</p>
                  <p className="text-xs mt-1">Other registered users will appear here</p>
                </div>
              ) : (
                chatUsers.map((chatUser) => (
                  <button
                    key={chatUser.id}
                    onClick={() => setSelectedUser(chatUser.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/10 transition-all duration-200 group"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {getInitials(chatUser.full_name, chatUser.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {chatUser.full_name || chatUser.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {chatUser.email}
                      </div>
                    </div>
                    {chatUser.unread_count > 0 && (
                      <Badge variant="destructive" className="rounded-full animate-pulse">
                        {chatUser.unread_count}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          // Chat View
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-4">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin rounded-full h-8 w-8 mx-auto mb-3 text-primary" />
                    <p className="text-sm">Loading messages...</p>
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
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
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
                                    className="max-w-full rounded-lg max-h-40 object-cover"
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
                                  <FileIcon className="h-4 w-4 shrink-0" />
                                  <span className="text-xs truncate">{msg.file_name}</span>
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
            <div className="p-4 border-t border-border/50 bg-muted/30">
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                  {selectedFile.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <FileIcon className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className="truncate flex-1 text-xs">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
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
                  className="shrink-0 h-9 w-9"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-background border-border/50 focus-visible:ring-primary h-9"
                  disabled={uploading}
                />
                <Button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  size="icon"
                  className="rounded-full shrink-0 h-9 w-9"
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
        )}
      </CardContent>
    </Card>
  );
};
