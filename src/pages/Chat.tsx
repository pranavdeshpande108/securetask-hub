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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  MoreVertical,
  Ban,
  Flag,
  Trash2,
  Timer,
  Smile,
  Circle,
  Search,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

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
    blockedUsers,
    blockUser,
    unblockUser,
    reportUser,
    clearChat,
    addReaction,
    removeReaction,
    setTypingStatus,
    otherUserTyping,
    searchQuery,
    setSearchQuery,
  } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [disappearingMinutes, setDisappearingMinutes] = useState<string>('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    const expMinutes = disappearingMinutes ? parseInt(disappearingMinutes) : undefined;
    await sendMessage(newMessage, selectedFile || undefined, expMinutes);
    setNewMessage('');
    setSelectedFile(null);
    setDisappearingMinutes('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    setTypingStatus(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 2000);
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
  const isUserBlocked = selectedUser ? blockedUsers.includes(selectedUser) : false;

  const isImageFile = (type: string | null | undefined) => {
    return type?.startsWith('image/');
  };

  const handleReport = () => {
    if (selectedUser && reportReason) {
      reportUser(selectedUser, reportReason, reportDetails);
      setShowReportDialog(false);
      setReportReason('');
      setReportDetails('');
    }
  };

  const handleClearChat = () => {
    if (selectedUser) {
      clearChat(selectedUser);
      setShowClearDialog(false);
    }
  };

  const handleReaction = (messageId: string, reaction: string) => {
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      r => r.user_id === user?.id && r.reaction === reaction
    );

    if (existingReaction) {
      removeReaction(messageId, reaction);
    } else {
      addReaction(messageId, reaction);
    }
    setShowReactionsFor(null);
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
                      } ${chatUser.is_blocked ? 'opacity-50' : ''}`}
                    >
                      <div className="relative">
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
                        {/* Online indicator */}
                        <Circle 
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                            chatUser.is_online 
                              ? 'text-green-500 fill-green-500' 
                              : 'text-muted-foreground fill-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {chatUser.full_name || chatUser.email}
                          {chatUser.is_blocked && (
                            <Ban className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                        <div className={`text-xs truncate ${
                          selectedUser === chatUser.id 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {chatUser.is_typing ? (
                            <span className="text-primary animate-pulse">typing...</span>
                          ) : chatUser.is_online ? (
                            'Online'
                          ) : chatUser.last_seen ? (
                            `Last seen ${formatDistanceToNow(new Date(chatUser.last_seen), { addSuffix: true })}`
                          ) : (
                            chatUser.email
                          )}
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
                <div className="p-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedUser(null)}
                        className="md:hidden"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {selectedUserData && getInitials(selectedUserData.full_name, selectedUserData.email)}
                          </AvatarFallback>
                        </Avatar>
                        <Circle 
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                            selectedUserData?.is_online 
                              ? 'text-green-500 fill-green-500' 
                              : 'text-muted-foreground fill-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {selectedUserData?.full_name || selectedUserData?.email}
                          {isUserBlocked && <Ban className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {otherUserTyping ? (
                            <span className="text-primary animate-pulse">typing...</span>
                          ) : selectedUserData?.is_online ? (
                            'Online'
                          ) : selectedUserData?.last_seen ? (
                            `Last seen ${formatDistanceToNow(new Date(selectedUserData.last_seen), { addSuffix: true })}`
                          ) : (
                            selectedUserData?.email
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isUserBlocked ? (
                          <DropdownMenuItem onClick={() => unblockUser(selectedUser)}>
                            <Ban className="mr-2 h-4 w-4" />
                            Unblock User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => blockUser(selectedUser)}>
                            <Ban className="mr-2 h-4 w-4" />
                            Block User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                          <Flag className="mr-2 h-4 w-4" />
                          Report User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowClearDialog(true)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Search Messages */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="pl-9 bg-background/50"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
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
                        const hasReactions = msg.reactions && msg.reactions.length > 0;
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                          >
                            <div className="relative">
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted rounded-bl-sm'
                                }`}
                              >
                                {msg.expires_at && (
                                  <div className={`flex items-center gap-1 text-xs mb-1 ${
                                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>
                                    <Timer className="h-3 w-3" />
                                    Disappears {formatDistanceToNow(new Date(msg.expires_at), { addSuffix: true })}
                                  </div>
                                )}
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
                                <div
                                  className={`flex items-center gap-1 text-xs mt-1 ${
                                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}
                                >
                                  <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                                  {isOwn && (
                                    msg.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )
                                  )}
                                </div>
                              </div>
                              
                              {/* Reactions Display */}
                              {hasReactions && (
                                <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                  {Array.from(new Set(msg.reactions?.map(r => r.reaction))).map(reaction => {
                                    const count = msg.reactions?.filter(r => r.reaction === reaction).length || 0;
                                    const userReacted = msg.reactions?.some(
                                      r => r.reaction === reaction && r.user_id === user?.id
                                    );
                                    return (
                                      <button
                                        key={reaction}
                                        onClick={() => handleReaction(msg.id, reaction)}
                                        className={`text-xs px-1.5 py-0.5 rounded-full border ${
                                          userReacted 
                                            ? 'bg-primary/20 border-primary' 
                                            : 'bg-muted border-border'
                                        }`}
                                      >
                                        {reaction} {count > 1 && count}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Reaction Button */}
                              <button
                                onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                                className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-card border shadow-sm ${
                                  isOwn ? '-left-8' : '-right-8'
                                }`}
                              >
                                <Smile className="h-4 w-4 text-muted-foreground" />
                              </button>
                              
                              {/* Reaction Picker */}
                              {showReactionsFor === msg.id && (
                                <div className={`absolute top-0 z-10 bg-card border rounded-full shadow-lg p-1 flex gap-1 ${
                                  isOwn ? '-left-32' : '-right-32'
                                }`}>
                                  {REACTIONS.map(reaction => (
                                    <button
                                      key={reaction}
                                      onClick={() => handleReaction(msg.id, reaction)}
                                      className="hover:scale-125 transition-transform p-1"
                                    >
                                      {reaction}
                                    </button>
                                  ))}
                                </div>
                              )}
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
                  {isUserBlocked ? (
                    <div className="text-center py-2 text-muted-foreground">
                      <Ban className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-sm">You have blocked this user</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => unblockUser(selectedUser)}
                      >
                        Unblock to send messages
                      </Button>
                    </div>
                  ) : (
                    <>
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
                      <div className="flex gap-2 items-center">
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
                        
                        {/* Disappearing Message Timer */}
                        <Select value={disappearingMinutes} onValueChange={setDisappearingMinutes}>
                          <SelectTrigger className="w-[100px] shrink-0">
                            <Timer className="h-4 w-4 mr-1" />
                            <SelectValue placeholder="Timer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Off</SelectItem>
                            <SelectItem value="1">1 min</SelectItem>
                            <SelectItem value="5">5 min</SelectItem>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="1440">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Input
                          value={newMessage}
                          onChange={(e) => handleTyping(e.target.value)}
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
                    </>
                  )}
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

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please provide details about why you're reporting this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="scam">Scam or Fraud</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Chat Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all messages in this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearChat}>
              Clear All Messages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
