import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Paperclip, 
  X, 
  FileIcon, 
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Ban,
  Flag,
  Trash2,
  Timer,
  Smile,
  Search,
  Check,
  CheckCheck,
  Copy,
  Share2,
  Phone,
  Video,
  Mic,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Link as LinkIcon,
  FileText,
  Download,
  ExternalLink,
  Home
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MEETING_ITEMS = [
  { text: "Finalize Q3 Budget", completed: false },
  { text: "Approve marketing assets", completed: false },
  { text: "Review team capacity", completed: false }
];

const CALENDAR_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CALENDAR_DATES = Array.from({ length: 31 }, (_, i) => i + 1);

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    messages,
    chatUsers,
    selectedUser,
    setSelectedUser,
    sendMessage,
    loading,
    uploading,
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
    deleteMessage,
  } = useChat();
  
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [disappearingMinutes, setDisappearingMinutes] = useState<string>('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'media' | 'links' | 'docs'>('media');
  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const openImage = (url: string) => { setModalImageUrl(url); setShowImageModal(true); };

  // File preview modal state (pdf/docs etc.)
  const [showFileModal, setShowFileModal] = useState(false);
  const [modalFileUrl, setModalFileUrl] = useState<string | null>(null);
  const [modalFileName, setModalFileName] = useState<string | null>(null);
  const [modalFileType, setModalFileType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const openFile = (url: string, name?: string, type?: string) => { 
    setModalFileUrl(url); 
    setModalFileName(name || null); 
    setModalFileType(type || null); 
    setShowFileModal(true); 
    setPreviewLoading(true);
  };

  // Preview helper: try to fetch PDFs as blob (to bypass X-Frame restrictions)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // When file modal opens, prepare preview
  useEffect(() => {
    let active = true;
    let createdObjectUrl: string | null = null;

    const preparePreview = async () => {
      setPreviewUrl(null);
      setPreviewError(null);
      if (!showFileModal || !modalFileUrl) {
        setPreviewLoading(false);
        return;
      }

      const isPdf = modalFileType?.includes('pdf') || (modalFileName || '').toLowerCase().endsWith('.pdf');
      const isOffice = /(application\/msword|vnd\.openxmlformats-officedocument|application\/vnd\.ms-excel|application\/vnd\.ms-powerpoint|\.docx$|\.doc$|\.pptx$|\.ppt$|\.xlsx$|\.xls$)/i.test(modalFileType || (modalFileName || ''));

      // For PDFs, fetch blob to embed directly (avoids X-Frame-Options issues)
      if (isPdf) {
        try {
          const res = await fetch(modalFileUrl!);
          if (!res.ok) throw new Error('Network error');
          const blob = await res.blob();
          createdObjectUrl = URL.createObjectURL(blob);
          if (!active) return;
          setPreviewUrl(createdObjectUrl);
          setPreviewLoading(false);
        } catch (err) {
          // If fetch fails, offer download instead
          setPreviewError('Preview not available for this file. Please download to view.');
          setPreviewLoading(false);
        }
        return;
      }

      // For office/docs, use Microsoft Office viewer or download
      if (isOffice) {
        const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(modalFileUrl!)}`;
        setPreviewUrl(viewer);
        setPreviewLoading(false);
        return;
      }

      // No inline preview available for this type
      setPreviewUrl(null);
      setPreviewLoading(false);
    };

    preparePreview();

    return () => {
      active = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
      setPreviewUrl(null);
      setPreviewError(null);
    };
  }, [showFileModal, modalFileUrl, modalFileName, modalFileType]);

  const downloadFile = async (url?: string, name?: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name || 'file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast({ title: 'Downloaded', description: `${name || 'File'} downloaded` });
    } catch (err) {
      toast({ title: 'Download failed', description: 'Could not download file' });
    }
  };

  // Extract shared media, links, and docs from messages
  const sharedContent = useMemo(() => {
    const media: { url: string; name: string; type: string; date: string }[] = [];
    const links: { url: string; text: string; date: string }[] = [];
    const docs: { url: string; name: string; type: string; date: string }[] = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach(msg => {
      // Check for file attachments
      if (msg.file_url) {
        const isImage = msg.file_type?.startsWith('image/');
        const isDoc = /(pdf|msword|openxmlformats-officedocument|vnd\.ms-excel|vnd\.ms-powerpoint)/i.test(msg.file_type || '');
        
        if (isImage) {
          media.push({
            url: msg.file_url,
            name: msg.file_name || 'Image',
            type: msg.file_type || 'image',
            date: msg.created_at
          });
        } else if (isDoc) {
          docs.push({
            url: msg.file_url,
            name: msg.file_name || 'Document',
            type: msg.file_type || 'document',
            date: msg.created_at
          });
        }
      }

      // Extract links from message text
      if (msg.message) {
        const matches = msg.message.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            // Skip if it's the same as file_url
            if (url !== msg.file_url) {
              links.push({
                url,
                text: url,
                date: msg.created_at
              });
            }
          });
        }
      }
    });

    return { media, links, docs };
  }, [messages]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle responsive: show user list on mobile when no user selected
  useEffect(() => {
    if (!selectedUser) {
      setShowMobileUserList(true);
    }
  }, [selectedUser]);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    const expMinutes = disappearingMinutes ? parseInt(disappearingMinutes) : undefined;
    await sendMessage(newMessage, selectedFile || undefined, expMinutes);
    setNewMessage('');
    setSelectedFile(null);
    setDisappearingMinutes('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX) {
        alert('File size must be 100MB or less');
        return;
      }
      setSelectedFile(file);
    }
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

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId);
    setShowMobileUserList(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <div className={`${showMobileUserList ? 'flex' : 'hidden'} md:flex w-full md:w-[290px] flex-col bg-card border-r border-border shrink-0 absolute md:relative z-20 h-full`}>
        
        {/* Current User Section */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email ? getInitials(null, user.email) : 'ME'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full"></span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground truncate max-w-[100px]">
                 {user?.email?.split('@')[0] || "User"}
              </h3>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => navigate('/availability')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 md:px-6 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-muted border-none rounded-lg text-sm h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1 pb-4">
            {chatUsers.map((chatUser) => (
              <div
                key={chatUser.id}
                onClick={() => handleSelectUser(chatUser.id)}
                className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                  selectedUser === chatUser.id ? 'bg-card shadow-md border border-border' : 'hover:bg-muted'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${
                      selectedUser === chatUser.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {getInitials(chatUser.full_name, chatUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-card rounded-full ${
                    chatUser.is_online ? 'bg-green-500' : 'bg-muted-foreground'
                  }`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-semibold truncate text-foreground">
                      {chatUser.full_name || chatUser.email.split('@')[0]}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {chatUser.last_seen ? formatDistanceToNow(new Date(chatUser.last_seen), { addSuffix: false }).replace('about ', '') : ''}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${
                    chatUser.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}>
                    {chatUser.is_typing ? (
                      <span className="text-primary">Typing...</span>
                    ) : (
                      "Click to chat"
                    )}
                  </p>
                </div>
                {chatUser.unread_count > 0 && (
                  <div className="h-2 w-2 bg-destructive rounded-full mt-2 shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`${!showMobileUserList || selectedUser ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-card border-r border-border min-w-0`}>
        
        {/* Header */}
        {selectedUser ? (
          <div className="h-[72px] px-4 md:px-6 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
               <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setShowMobileUserList(true)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Avatar className="h-10 w-10">
                   <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedUserData && getInitials(selectedUserData.full_name, selectedUserData.email)}
                   </AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-card rounded-full ${
                  selectedUserData?.is_online ? 'bg-green-500' : 'bg-muted-foreground'
                }`}></span>
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {selectedUserData?.full_name || selectedUserData?.email}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${
                    selectedUserData?.is_online ? 'text-green-500' : 'text-muted-foreground'
                  }`}>
                    {otherUserTyping ? 'Typing...' : (selectedUserData?.is_online ? 'Online' : 'Offline')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-primary hover:bg-muted">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:text-primary hover:bg-muted">
                <Video className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-muted">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isUserBlocked ? (
                    <DropdownMenuItem onClick={() => unblockUser(selectedUser)}>
                      <Ban className="mr-2 h-4 w-4" /> Unblock User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => blockUser(selectedUser)}>
                      <Ban className="mr-2 h-4 w-4" /> Block User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag className="mr-2 h-4 w-4" /> Report User
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="h-[72px] px-4 md:px-6 border-b border-border flex items-center justify-between shrink-0">
             <div className="font-semibold text-lg text-foreground">Messages</div>
          </div>
        )}

        {/* Messages List */}
        <ScrollArea className="flex-1 p-4 md:p-6 bg-card">
          {!selectedUser ? (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <p>Select a conversation to start chatting</p>
             </div>
          ) : loading ? (
             <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : messages.length === 0 ? (
             <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>No messages yet</p>
             </div>
          ) : (
             <div className="space-y-6">
               <div className="flex justify-center">
                 <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">Today</span>
               </div>
               
               {messages.map((msg) => {
                 const isOwn = msg.sender_id === user?.id;
                 return (
                   <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}>
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 mt-1 shrink-0">
                        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                          {isOwn ? getInitials(null, user?.email || '') : getInitials(selectedUserData?.full_name || null, selectedUserData?.email || '')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Bubble Container */}
                      <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                         <div className={`relative px-4 py-3 text-sm shadow-sm ${
                           isOwn 
                             ? 'bg-primary text-primary-foreground rounded-[12px] rounded-tr-none' 
                             : 'bg-muted text-foreground rounded-[12px] rounded-tl-none'
                         }`}>
                           
                           {/* Attachments */}
                           {msg.file_url && (
                            <div className="mb-2">
                              {isImageFile(msg.file_type) ? (
                                <button
                                  type="button"
                                  onClick={() => openImage(msg.file_url!)}
                                  className="block overflow-hidden rounded-lg"
                                >
                                  <img
                                    src={msg.file_url}
                                    alt="attachment"
                                    className="max-w-full max-h-60 object-cover"
                                  />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openFile(msg.file_url!, msg.file_name, msg.file_type)}
                                  onContextMenu={(e) => e.preventDefault()}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    isOwn ? 'bg-primary-foreground/10' : 'bg-card'
                                  }`}
                                >
                                  <FileIcon className="h-4 w-4" />
                                  <span className="truncate">{msg.file_name || 'File'}</span>
                                </button>
                              )}
                            </div>
                           )}

                           {/* Message Text */}
                           {msg.message && !msg.message.startsWith('Sent a file:') && (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                           )}

                           {/* Actions Dropdown on Hover */}
                           <div className={`absolute top-2 ${isOwn ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-muted">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                                  <DropdownMenuItem onClick={() => {
                                    if(msg.message) navigator.clipboard.writeText(msg.message);
                                    toast({ title: "Copied!" });
                                  }}>
                                    <Copy className="h-3 w-3 mr-2" /> Copy
                                  </DropdownMenuItem>
                                  {isOwn && (
                                    <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="text-destructive">
                                      <Trash2 className="h-3 w-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </div>

                         </div>
                         
                         {/* Timestamp */}
                         <span className="text-[11px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                           {format(new Date(msg.created_at), 'hh:mm a')}
                           {isOwn && (
                              <span className="inline-flex">
                                {msg.is_read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3" />}
                              </span>
                           )}
                         </span>

                         {/* Reactions */}
                         {msg.reactions && msg.reactions.length > 0 && (
                           <div className="flex gap-1 mt-1">
                             {Array.from(new Set(msg.reactions.map(r => r.reaction))).map(emoji => (
                               <Badge key={emoji} variant="secondary" className="text-[10px] px-1 h-5 bg-card border border-border">
                                 {emoji} {msg.reactions?.filter(r => r.reaction === emoji).length}
                               </Badge>
                             ))}
                           </div>
                         )}
                      </div>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
             </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-card border-t border-border">
           {selectedUser && !isUserBlocked ? (
            <div className="flex items-end gap-2 md:gap-3">
              {/* Attach Button */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:bg-muted shrink-0 h-10 w-10 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-5 w-5" />
              </Button>

              {/* Text Input */}
              <div className="flex-1 bg-muted rounded-[12px] border border-transparent focus-within:border-primary focus-within:bg-card transition-all flex items-center px-3 py-1">
                <Textarea 
                   value={newMessage}
                   onChange={(e) => handleTyping(e.target.value)}
                   onKeyDown={(e) => {
                     if(e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSend();
                     }
                   }}
                   placeholder="Type a message..."
                   className="min-h-[40px] max-h-[120px] w-full resize-none border-none shadow-none focus-visible:ring-0 bg-transparent text-sm py-2.5"
                />
                
                {selectedFile && (
                  <div className="flex items-center gap-2 mr-2 bg-primary/10 px-2 py-1 rounded">
                    <span className="text-xs text-primary max-w-[60px] md:max-w-[100px] truncate">{selectedFile.name}</span>
                    <X className="h-3 w-3 cursor-pointer text-primary" onClick={() => setSelectedFile(null)} />
                  </div>
                )}

                {/* Disappearing Timer */}
                <Select value={disappearingMinutes} onValueChange={setDisappearingMinutes}>
                  <SelectTrigger className="w-[30px] h-[30px] p-0 border-none shadow-none focus:ring-0 text-muted-foreground hover:text-primary">
                    <Timer className="h-5 w-5" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="60">1 hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Emoji Button - hidden on small screens */}
              <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground hover:bg-muted shrink-0 h-10 w-10 rounded-full">
                <Smile className="h-5 w-5" />
              </Button>

              {/* Send / Voice Button */}
              {newMessage.trim() || selectedFile ? (
                 <Button 
                   onClick={handleSend}
                   disabled={uploading}
                   className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-10 w-10 rounded-[10px]"
                 >
                   {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                 </Button>
              ) : (
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 h-10 w-10 rounded-[10px]">
                   <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
           ) : isUserBlocked ? (
             <div className="text-center text-muted-foreground text-sm py-4 bg-muted rounded-xl">
               You blocked this user. <Button variant="link" className="text-primary p-0 h-auto" onClick={() => unblockUser(selectedUser)}>Unblock</Button>
             </div>
           ) : (
             <div className="text-center text-muted-foreground text-sm py-4">
               Select a chat to message
             </div>
           )}
        </div>
      </div>

      {/* RIGHT SIDEBAR - Media/Links/Docs */}
      <div className="w-[320px] bg-card border-l border-border shrink-0 hidden xl:flex flex-col">
        
        <Tabs value={rightSidebarTab} onValueChange={(v) => setRightSidebarTab(v as any)} className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger 
              value="media" 
              className="flex-1 py-4 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Media
            </TabsTrigger>
            <TabsTrigger 
              value="links" 
              className="flex-1 py-4 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Links
            </TabsTrigger>
            <TabsTrigger 
              value="docs" 
              className="flex-1 py-4 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
            >
              Docs
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="media" className="m-0 p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Shared Media</h3>
              {sharedContent.media.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No shared media yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {sharedContent.media.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => openImage(item.url)}
                      className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="links" className="m-0 p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Shared Links</h3>
              {sharedContent.links.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No shared links yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedContent.links.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{item.url}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="docs" className="m-0 p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Shared Documents</h3>
              {sharedContent.docs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No shared documents yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sharedContent.docs.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => openFile(item.url, item.name, item.type)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <FileIcon className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), 'MMM d, yyyy')}</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>

          {/* MOM Last Meeting - Static */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MOM Last Meeting</h3>
               <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
                 <Edit2 className="h-3 w-3" />
               </Button>
            </div>
            <div className="bg-muted rounded-lg p-3 space-y-2">
               {MEETING_ITEMS.map((item, idx) => (
                 <div key={idx} className="flex items-start gap-2">
                   <div className="h-4 w-4 rounded-full border-2 border-primary shrink-0 mt-0.5"></div>
                   <span className="text-sm text-foreground leading-tight">{item.text}</span>
                 </div>
               ))}
            </div>
          </div>
        </Tabs>
      </div>


      {/* Dialogs */}
      <Dialog open={showImageModal} onOpenChange={(open) => { if (!open) { setShowImageModal(false); setModalImageUrl(null); } }}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0">
          <div className="relative flex items-center justify-center">
             <Button className="absolute top-0 right-0 m-4 rounded-full" variant="secondary" onClick={() => setShowImageModal(false)}>
               <X className="h-4 w-4" />
             </Button>
             <img src={modalImageUrl || ''} alt="Preview" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" draggable={false} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
          </div>
        </DialogContent>
      </Dialog>

      {/* File preview dialog - Use embed/object for PDFs */}
      <Dialog open={showFileModal} onOpenChange={(open) => { if (!open) { setShowFileModal(false); setModalFileUrl(null); setModalFileName(null); setModalFileType(null); setPreviewUrl(null); setPreviewError(null); } }}>
        <DialogContent className="max-w-4xl p-4 bg-card rounded-lg shadow-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              {modalFileName || 'File preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">{previewError}</p>
                <div className="flex gap-2">
                  <Button onClick={() => downloadFile(modalFileUrl!, modalFileName || 'file')}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button variant="outline" onClick={() => { setShowFileModal(false); }}>Close</Button>
                </div>
              </div>
            ) : previewUrl && (modalFileType?.includes('pdf') || modalFileName?.toLowerCase().endsWith('.pdf')) ? (
              // Use embed for PDFs (blob URLs work better than iframe)
              <embed 
                src={previewUrl} 
                type="application/pdf" 
                className="w-full h-[70vh] rounded-lg"
              />
            ) : previewUrl ? (
              <iframe 
                src={previewUrl} 
                title={modalFileName || 'file'} 
                className="w-full h-[70vh] border-none rounded-lg bg-white" 
                onLoad={() => setPreviewLoading(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-foreground mb-2">{modalFileName}</p>
                <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
                <div className="flex gap-2">
                  <Button onClick={() => downloadFile(modalFileUrl!, modalFileName || 'file')}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button variant="outline" onClick={() => { setShowFileModal(false); }}>Close</Button>
                </div>
              </div>
            )}
          </div>
          {previewUrl && !previewError && (
            <DialogFooter className="shrink-0 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => downloadFile(modalFileUrl!, modalFileName || 'file')}>
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button onClick={() => setShowFileModal(false)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>Please provide details about why you're reporting this user.</DialogDescription>
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
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={!reportReason}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Chat</DialogTitle>
            <DialogDescription>Are you sure you want to delete all messages? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearChat}>Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
