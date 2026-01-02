import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Paperclip, 
  X, 
  FileIcon, 
  Image as ImageIcon,
  Moon,
  Sun,
  LogOut,
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
  Edit2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

// Dummy data for Right Sidebar UI (Hardcoded as per instructions)
const SHARED_MEDIA = [
  { id: 1, color: 'bg-emerald-200' },
  { id: 2, color: 'bg-teal-200' },
  { id: 3, color: 'bg-green-200' },
  { id: 4, color: 'bg-orange-200' },
];

const MEETING_ITEMS = [
  { text: "Finalize Q3 Budget", completed: false },
  { text: "Approve marketing assets", completed: false },
  { text: "Review team capacity", completed: false }
];

const CALENDAR_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CALENDAR_DATES = Array.from({ length: 31 }, (_, i) => i + 1);

const Chat = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const openFile = (url: string, name?: string, type?: string) => { setModalFileUrl(url); setModalFileName(name || null); setModalFileType(type || null); setShowFileModal(true); };

  // Preview helper: try to fetch PDFs as blob (to bypass X-Frame restrictions) and fall back to Google Docs viewer
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // When file modal opens, prepare preview
  useEffect(() => {
    let active = true;
    let createdObjectUrl: string | null = null;

    const preparePreview = async () => {
      setPreviewUrl(null);
      setPreviewError(null);
      if (!showFileModal || !modalFileUrl) return;

      const isPdf = modalFileType?.includes('pdf') || (modalFileName || '').toLowerCase().endsWith('.pdf');
      const isOffice = /(application\/msword|vnd\.openxmlformats-officedocument|application\/vnd\.ms-excel|application\/vnd\.ms-powerpoint|\.docx$|\.doc$|\.pptx$|\.ppt$|\.xlsx$|\.xls$)/i.test(modalFileType || (modalFileName || ''));

      // For PDFs, prefer to fetch blob to embed directly
      if (isPdf) {
        try {
          const res = await fetch(modalFileUrl!);
          if (!res.ok) throw new Error('Network error');
          const blob = await res.blob();
          createdObjectUrl = URL.createObjectURL(blob);
          if (!active) return;
          setPreviewUrl(createdObjectUrl);
        } catch (err) {
          // fallback to Google Docs viewer
          const viewer = `https://docs.google.com/gview?url=${encodeURIComponent(modalFileUrl!)}&embedded=true`;
          setPreviewUrl(viewer);
          setPreviewError('Direct preview failed; using Google Docs viewer. If viewer cannot access the file, download instead.');
        }
        return;
      }

      // For office/docs, try Google viewer first
      if (isOffice) {
        const viewer = `https://docs.google.com/gview?url=${encodeURIComponent(modalFileUrl!)}&embedded=true`;
        setPreviewUrl(viewer);
        setPreviewError(null);
        return;
      }

      // No inline preview available for this type
      setPreviewUrl(null);
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

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1F2937] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR (290px) */}
      <div className="w-[290px] flex flex-col bg-white border-r border-[#E5E7EB] shrink-0">
        
        {/* Current User Section */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" /> {/* Placeholder for user image */}
                <AvatarFallback className="bg-[#5B5FED] text-white">
                  {user?.email ? getInitials(null, user.email) : 'ME'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1F2937] truncate max-w-[120px]">
                 {/* Display name or email prefix */}
                 {user?.email?.split('@')[0] || "User"}
              </h3>
              <p className="text-xs text-[#6B7280]">Online</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-[#6B7280]">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-6 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input 
              placeholder="Search users..." 
              className="pl-9 bg-[#F3F4F6] border-none rounded-lg text-sm h-10"
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
                onClick={() => setSelectedUser(chatUser.id)}
                className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                  selectedUser === chatUser.id ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[#E5E7EB]' : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${
                      selectedUser === chatUser.id ? 'bg-[#5B5FED] text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getInitials(chatUser.full_name, chatUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${
                    chatUser.is_online ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`text-sm font-semibold truncate ${
                       selectedUser === chatUser.id ? 'text-[#1F2937]' : 'text-[#374151]'
                    }`}>
                      {chatUser.full_name || chatUser.email.split('@')[0]}
                    </h4>
                    <span className="text-[11px] text-[#9CA3AF]">
                      {chatUser.last_seen ? formatDistanceToNow(new Date(chatUser.last_seen), { addSuffix: false }).replace('about ', '') : ''}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${
                    chatUser.unread_count > 0 ? 'font-semibold text-[#1F2937]' : 'text-[#6B7280]'
                  }`}>
                    {chatUser.is_typing ? (
                      <span className="text-[#5B5FED]">Typing...</span>
                    ) : (
                      "Click to chat"
                    )}
                  </p>
                </div>
                {chatUser.unread_count > 0 && (
                  <div className="h-2 w-2 bg-red-500 rounded-full mt-2 shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* MAIN CHAT AREA (Fluid) */}
      <div className="flex-1 flex flex-col bg-white border-r border-[#E5E7EB] min-w-0">
        
        {/* Header */}
        {selectedUser ? (
          <div className="h-[72px] px-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
               <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={() => setSelectedUser(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Avatar className="h-10 w-10">
                   <AvatarFallback className="bg-[#5B5FED] text-white">
                      {selectedUserData && getInitials(selectedUserData.full_name, selectedUserData.email)}
                   </AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${
                  selectedUserData?.is_online ? 'bg-[#10B981]' : 'bg-gray-300'
                }`}></span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#1F2937]">
                  {selectedUserData?.full_name || selectedUserData?.email}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${
                    selectedUserData?.is_online ? 'text-[#10B981]' : 'text-[#6B7280]'
                  }`}>
                    {otherUserTyping ? 'Typing...' : (selectedUserData?.is_online ? 'Online' : 'Offline')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-[#5B5FED] hover:bg-[#F3F4F6]">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-[#5B5FED] hover:bg-[#F3F4F6]">
                <Video className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-[#5B5FED] hover:bg-[#F3F4F6]">
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
                  <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Clear Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <div className="h-[72px] px-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
             <div className="font-semibold text-lg">Messages</div>
          </div>
        )}

        {/* Messages List */}
        <ScrollArea className="flex-1 p-6 bg-white">
          {!selectedUser ? (
             <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF]">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                <p>Select a conversation to start chatting</p>
             </div>
          ) : loading ? (
             <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#5B5FED]" />
             </div>
          ) : messages.length === 0 ? (
             <div className="h-full flex items-center justify-center text-[#9CA3AF]">
                <p>No messages yet</p>
             </div>
          ) : (
             <div className="space-y-6">
               <div className="flex justify-center">
                 <span className="bg-[#F3F4F6] text-[#6B7280] text-xs px-3 py-1 rounded-full">Today</span>
               </div>
               
               {messages.map((msg) => {
                 const isOwn = msg.sender_id === user?.id;
                 return (
                   <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}>
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 mt-1 shrink-0">
                        <AvatarFallback className={isOwn ? 'bg-[#5B5FED] text-white' : 'bg-gray-200 text-gray-600'}>
                          {isOwn ? getInitials(null, user?.email || '') : getInitials(selectedUserData?.full_name || null, selectedUserData?.email || '')}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Bubble Container */}
                      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                         <div className={`relative px-4 py-3 text-sm shadow-sm ${
                           isOwn 
                             ? 'bg-[#5B5FED] text-white rounded-[12px] rounded-tr-none' 
                             : 'bg-[#F3F4F6] text-[#1F2937] rounded-[12px] rounded-tl-none'
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
                                    isOwn ? 'bg-white/10' : 'bg-white'
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
                                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-gray-100">
                                    <span className="sr-only">Open menu</span>
                                    <div className="h-1 w-1 bg-gray-400 rounded-full mb-0.5"></div>
                                    <div className="h-1 w-1 bg-gray-400 rounded-full mb-0.5"></div>
                                    <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
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
                                    <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="text-red-500">
                                      <Trash2 className="h-3 w-3 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </div>

                         </div>
                         
                         {/* Timestamp */}
                         <span className="text-[11px] text-[#9CA3AF] mt-1 px-1">
                           {format(new Date(msg.created_at), 'hh:mm a')}
                           {isOwn && (
                              <span className="ml-1 inline-block">
                                {msg.is_read ? <CheckCheck className="h-3 w-3 text-[#5B5FED]" /> : <Check className="h-3 w-3" />}
                              </span>
                           )}
                         </span>

                         {/* Reactions */}
                         {msg.reactions && msg.reactions.length > 0 && (
                           <div className="flex gap-1 mt-1">
                             {Array.from(new Set(msg.reactions.map(r => r.reaction))).map(emoji => (
                               <Badge key={emoji} variant="secondary" className="text-[10px] px-1 h-5 bg-white border border-gray-200">
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
        <div className="p-6 bg-white border-t border-[#E5E7EB]">
           {selectedUser && !isUserBlocked ? (
            <div className="flex items-end gap-3">
              {/* Attach Button */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-[#6B7280] hover:bg-[#F3F4F6] shrink-0 h-10 w-10 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-5 w-5" />
              </Button>

              {/* Text Input */}
              <div className="flex-1 bg-[#F8F9FA] rounded-[12px] border border-transparent focus-within:border-[#5B5FED] focus-within:bg-white transition-all flex items-center px-3 py-1">
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
                  <div className="flex items-center gap-2 mr-2 bg-blue-50 px-2 py-1 rounded">
                    <span className="text-xs text-blue-600 max-w-[100px] truncate">{selectedFile.name}</span>
                    <X className="h-3 w-3 cursor-pointer text-blue-600" onClick={() => setSelectedFile(null)} />
                  </div>
                )}

                {/* Disappearing Timer (Hidden in basic UI but preserved functionality) */}
                <Select value={disappearingMinutes} onValueChange={setDisappearingMinutes}>
                  <SelectTrigger className="w-[30px] h-[30px] p-0 border-none shadow-none focus:ring-0 text-[#9CA3AF] hover:text-[#5B5FED]">
                    <Timer className="h-5 w-5" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="60">1 hr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Emoji Button */}
              <Button variant="ghost" size="icon" className="text-[#6B7280] hover:bg-[#F3F4F6] shrink-0 h-10 w-10 rounded-full">
                <Smile className="h-5 w-5" />
              </Button>

              {/* Send / Voice Button */}
              {newMessage.trim() || selectedFile ? (
                 <Button 
                   onClick={handleSend}
                   disabled={uploading}
                   className="bg-[#5B5FED] hover:bg-[#4f53d1] text-white shrink-0 h-10 w-10 rounded-[10px]"
                 >
                   {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                 </Button>
              ) : (
                <Button className="bg-[#5B5FED] hover:bg-[#4f53d1] text-white shrink-0 h-10 w-10 rounded-[10px]">
                   <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
           ) : isUserBlocked ? (
             <div className="text-center text-[#6B7280] text-sm py-4 bg-[#F3F4F6] rounded-xl">
               You blocked this user. <Button variant="link" className="text-[#5B5FED] p-0 h-auto" onClick={() => unblockUser(selectedUser)}>Unblock</Button>
             </div>
           ) : (
             <div className="text-center text-[#9CA3AF] text-sm py-4">
               Select a chat to message
             </div>
           )}
        </div>
      </div>

      {/* RIGHT SIDEBAR (320px) - Hardcoded UI Parts as per instructions */}
      <div className="w-[320px] bg-white border-l border-[#E5E7EB] shrink-0 hidden xl:flex flex-col">
        
        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB]">
          {['Media', 'Links', 'Docs'].map((tab, i) => (
            <button 
              key={tab}
              className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                i === 0 ? 'text-[#5B5FED]' : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              {tab}
              {i === 0 && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#5B5FED]"></span>}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            
            {/* Shared Media */}
            <section>
              <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Shared Media</h3>
              <div className="grid grid-cols-3 gap-3">
                 <div className="aspect-square bg-[#374151] rounded-[12px] flex items-center justify-center text-white relative overflow-hidden group">
                    <span className="text-xs font-medium z-10">MEDIA</span>
                    <div className="absolute inset-0 bg-black/20"></div>
                 </div>
                 {SHARED_MEDIA.slice(0, 3).map((item, idx) => (
                   <div key={idx} className={`aspect-square rounded-[12px] ${item.color} flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}>
                      {/* Placeholder for images */}
                   </div>
                 ))}
                 <div className="aspect-square bg-[#F3F4F6] rounded-[12px] flex items-center justify-center text-[#6B7280] text-sm font-medium cursor-pointer hover:bg-gray-200">
                   +4
                 </div>
              </div>
            </section>

            {/* MOM Last Meeting */}
            <section>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">MOM Last Meeting</h3>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-[#5B5FED]">
                   <Edit2 className="h-3 w-3" />
                 </Button>
              </div>
              <div className="bg-[#F3F4F6] rounded-[12px] p-4 space-y-3">
                 {MEETING_ITEMS.map((item, idx) => (
                   <div key={idx} className="flex items-start gap-2">
                     <div className="h-4 w-4 rounded-full border-2 border-[#5B5FED] shrink-0 mt-0.5"></div>
                     <span className="text-sm text-[#1F2937] leading-tight">{item.text}</span>
                   </div>
                 ))}
              </div>
            </section>

            {/* Availability Calendar */}
            <section>
               <h3 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Availability</h3>
               <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold">October 2023</span>
                    <div className="flex gap-1">
                      <ChevronLeft className="h-4 w-4 text-[#9CA3AF]" />
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-y-3 mb-2">
                    {CALENDAR_DAYS.map(day => (
                      <div key={day} className="text-[10px] text-[#9CA3AF] text-center">{day}</div>
                    ))}
                    {/* Dummy spacing for start of month */}
                    <div></div> 
                    {CALENDAR_DATES.map(date => (
                      <div key={date} className="flex justify-center">
                        <span className={`h-7 w-7 flex items-center justify-center text-xs rounded-full ${
                          date === 4 ? 'bg-[#5B5FED] text-white' : 'text-[#374151]'
                        } relative`}>
                          {date}
                          {date === 9 && (
                            <span className="absolute -bottom-1 h-1 w-1 bg-[#5B5FED] rounded-full"></span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="mt-3 flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-[#5B5FED]"></div>
                 <span className="text-xs text-[#6B7280]">Available: 2:00 PM - 5:00 PM</span>
               </div>
            </section>
            
          </div>
        </ScrollArea>
      </div>

      {/* Floating Action Button for Theme */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button 
          onClick={toggleTheme} 
          className="h-12 w-12 rounded-full bg-[#5B5FED] hover:bg-[#4f53d1] text-white shadow-lg"
        >
          {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </Button>
      </div>

      {/* Dialogs (Preserved Functionality) */}
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

      {/* File preview dialog (PDF/Docs) */}
      <Dialog open={showFileModal} onOpenChange={(open) => { if (!open) { setShowFileModal(false); setModalFileUrl(null); setModalFileName(null); setModalFileType(null); } }}>
        <DialogContent className="max-w-4xl p-4 bg-card rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle>{modalFileName || 'File preview'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh]">
            {((modalFileType && modalFileType.includes('pdf')) || (modalFileName || '').toLowerCase().endsWith('.pdf')) ? (
              previewUrl ? (
                <iframe src={previewUrl || ''} title={modalFileName || 'pdf'} className="w-full h-[70vh] border-none" />
              ) : (
                <div className="p-6 text-center">
                  <div className="mb-2">Loading preview...</div>
                  {previewError && <div className="text-sm text-muted-foreground mb-4">{previewError}</div>}
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => downloadFile(modalFileUrl!, modalFileName || 'file')}>Download</Button>
                    <Button variant="outline" onClick={() => { setShowFileModal(false); setModalFileUrl(null); setModalFileName(null); setModalFileType(null); }}>Close</Button>
                  </div>
                </div>
              )
            ) : modalFileType && /msword|openxmlformats-officedocument|vnd\\.ms-excel|vnd\\.ms-powerpoint/i.test(modalFileType || '') ? (
              previewUrl ? (
                <iframe src={previewUrl || ''} title={modalFileName || 'file'} className="w-full h-[70vh] border-none" />
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">Preview not available</div>
              )
            ) : modalFileUrl ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileIcon className="h-8 w-8" />
                <div className="text-sm">{modalFileName}</div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => downloadFile(modalFileUrl!, modalFileName || 'file')}>Download</Button>
                  <Button variant="outline" onClick={() => { setShowFileModal(false); setModalFileUrl(null); setModalFileName(null); setModalFileType(null); }}>Close</Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">No preview available</div>
            )}
          </div>
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
            <Button onClick={handleReport} disabled={!reportReason} className="bg-[#5B5FED]">Submit Report</Button>
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