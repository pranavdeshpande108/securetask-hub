import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  sender?: {
    full_name: string | null;
    email: string;
  };
  receiver?: {
    full_name: string | null;
    email: string;
  };
}

interface ChatUser {
  id: string;
  email: string;
  full_name: string | null;
  unread_count: number;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch all users for chat
  const fetchChatUsers = async () => {
    if (!user) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .neq('id', user.id);

      if (profilesError) throw profilesError;

      // Get unread counts for each user
      const usersWithUnread = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

          return {
            ...profile,
            unread_count: count || 0,
          };
        })
      );

      setChatUsers(usersWithUnread);
    } catch (error) {
      console.error('Error fetching chat users:', error);
    }
  };

  // Fetch messages between current user and selected user
  const fetchMessages = async () => {
    if (!user || !selectedUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(full_name, email),
          receiver:profiles!chat_messages_receiver_id_fkey(full_name, email)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUser)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      fetchChatUsers();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload file and return URL
  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    if (!user) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        name: file.name,
        type: file.type,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Send a message with optional file
  const sendMessage = async (message: string, file?: File) => {
    if (!user || !selectedUser) return;
    if (!message.trim() && !file) return;

    try {
      let fileData = null;
      if (file) {
        fileData = await uploadFile(file);
      }

      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser,
        message: message.trim() || (fileData ? `Sent a file: ${fileData.name}` : ''),
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          if (
            (newMessage.sender_id === selectedUser && newMessage.receiver_id === user.id) ||
            (newMessage.sender_id === user.id && newMessage.receiver_id === selectedUser)
          ) {
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                *,
                sender:profiles!chat_messages_sender_id_fkey(full_name, email),
                receiver:profiles!chat_messages_receiver_id_fkey(full_name, email)
              `)
              .eq('id', newMessage.id)
              .maybeSingle();

            if (data) {
              setMessages((prev) => [...prev, data]);

              if (newMessage.receiver_id === user.id) {
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', newMessage.id);
              }
            }
          }

          fetchChatUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  useEffect(() => {
    fetchChatUsers();
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  const totalUnread = chatUsers.reduce((sum, u) => sum + u.unread_count, 0);

  return {
    messages,
    chatUsers,
    selectedUser,
    setSelectedUser,
    sendMessage,
    loading,
    uploading,
    totalUnread,
    refreshUsers: fetchChatUsers,
  };
};
