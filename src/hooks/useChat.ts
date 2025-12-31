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

  // Fetch all users (for admin) or just admin users (for regular users)
  const fetchChatUsers = async () => {
    if (!user) return;

    try {
      // Get all profiles
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

      // Refresh unread counts
      fetchChatUsers();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (message: string) => {
    if (!user || !selectedUser || !message.trim()) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser,
        message: message.trim(),
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
          
          // If the message is for the current conversation
          if (
            (newMessage.sender_id === selectedUser && newMessage.receiver_id === user.id) ||
            (newMessage.sender_id === user.id && newMessage.receiver_id === selectedUser)
          ) {
            // Fetch the complete message with sender/receiver info
            const { data } = await supabase
              .from('chat_messages')
              .select(`
                *,
                sender:profiles!chat_messages_sender_id_fkey(full_name, email),
                receiver:profiles!chat_messages_receiver_id_fkey(full_name, email)
              `)
              .eq('id', newMessage.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data]);

              // Mark as read if we're the receiver
              if (newMessage.receiver_id === user.id) {
                await supabase
                  .from('chat_messages')
                  .update({ is_read: true })
                  .eq('id', newMessage.id);
              }
            }
          }

          // Refresh unread counts
          fetchChatUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUser]);

  // Fetch users on mount
  useEffect(() => {
    fetchChatUsers();
  }, [user]);

  // Fetch messages when selected user changes
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
    totalUnread,
    refreshUsers: fetchChatUsers,
  };
};
