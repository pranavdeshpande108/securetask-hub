import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Calendar, Clock, Users, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_minutes: number;
  created_by: string;
  created_at: string;
  participants?: { user_id: string; attended: boolean; profiles?: { full_name: string | null; email: string } }[];
  minutes?: { id: string; content: string; recorded_by: string; created_at: string }[];
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

const Meetings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);
  const [newMinutes, setNewMinutes] = useState('');
  const [creating, setCreating] = useState(false);

  // Form state for new meeting
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meeting_date: '',
    meeting_time: '',
    duration_minutes: 60,
    participants: [] as string[],
  });

  useEffect(() => {
    fetchMeetings();
    fetchProfiles();
  }, [user]);

  const fetchMeetings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch meetings where user is creator or participant
      const { data: meetingsData, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;

      // Fetch participants and minutes for each meeting
      const enrichedMeetings = await Promise.all(
        (meetingsData || []).map(async (meeting) => {
          const { data: participants } = await supabase
            .from('meeting_participants')
            .select('user_id, attended, profiles:profiles(full_name, email)')
            .eq('meeting_id', meeting.id);

          const { data: minutes } = await supabase
            .from('meeting_minutes')
            .select('*')
            .eq('meeting_id', meeting.id)
            .order('created_at', { ascending: false });

          return {
            ...meeting,
            participants: participants || [],
            minutes: minutes || [],
          };
        })
      );

      setMeetings(enrichedMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({ title: 'Error', description: 'Failed to load meetings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .neq('id', user.id);
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!user || !newMeeting.title || !newMeeting.meeting_date || !newMeeting.meeting_time) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const meetingDateTime = new Date(`${newMeeting.meeting_date}T${newMeeting.meeting_time}`);

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: newMeeting.title,
          description: newMeeting.description || null,
          meeting_date: meetingDateTime.toISOString(),
          duration_minutes: newMeeting.duration_minutes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants
      if (newMeeting.participants.length > 0 && meeting) {
        const participantInserts = newMeeting.participants.map((userId) => ({
          meeting_id: meeting.id,
          user_id: userId,
        }));

        await supabase.from('meeting_participants').insert(participantInserts);
      }

      // Add creator as participant
      if (meeting) {
        await supabase.from('meeting_participants').insert({
          meeting_id: meeting.id,
          user_id: user.id,
        });
      }

      toast({ title: 'Success', description: 'Meeting created successfully' });
      setShowCreateDialog(false);
      setNewMeeting({
        title: '',
        description: '',
        meeting_date: '',
        meeting_time: '',
        duration_minutes: 60,
        participants: [],
      });
      fetchMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({ title: 'Error', description: 'Failed to create meeting', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleAddMinutes = async () => {
    if (!user || !selectedMeeting || !newMinutes.trim()) {
      toast({ title: 'Error', description: 'Please enter meeting minutes', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('meeting_minutes').insert({
        meeting_id: selectedMeeting.id,
        content: newMinutes.trim(),
        recorded_by: user.id,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Minutes added successfully' });
      setNewMinutes('');
      setShowMinutesDialog(false);
      fetchMeetings();
    } catch (error) {
      console.error('Error adding minutes:', error);
      toast({ title: 'Error', description: 'Failed to add minutes', variant: 'destructive' });
    }
  };

  const isPastMeeting = (date: string) => new Date(date) < new Date();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meetings</h1>
            <p className="text-muted-foreground">View and manage your meetings and minutes</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Meeting</DialogTitle>
                <DialogDescription>Schedule a new meeting with participants</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Meeting title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Meeting description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMeeting.meeting_date}
                      onChange={(e) => setNewMeeting((prev) => ({ ...prev, meeting_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newMeeting.meeting_time}
                      onChange={(e) => setNewMeeting((prev) => ({ ...prev, meeting_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select
                    value={String(newMeeting.duration_minutes)}
                    onValueChange={(val) => setNewMeeting((prev) => ({ ...prev, duration_minutes: parseInt(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Participants</Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
                    {profiles.map((profile) => (
                      <Badge
                        key={profile.id}
                        variant={newMeeting.participants.includes(profile.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setNewMeeting((prev) => ({
                            ...prev,
                            participants: prev.participants.includes(profile.id)
                              ? prev.participants.filter((id) => id !== profile.id)
                              : [...prev.participants, profile.id],
                          }));
                        }}
                      >
                        {profile.full_name || profile.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMeeting} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Meeting
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Meeting List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Meetings</CardTitle>
                  <CardDescription>Select a meeting to view details</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {meetings.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No meetings yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {meetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            onClick={() => setSelectedMeeting(meeting)}
                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedMeeting?.id === meeting.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{meeting.title}</h4>
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(meeting.meeting_date), 'MMM d, yyyy')}</span>
                                  <Clock className="h-3 w-3 ml-2" />
                                  <span>{format(new Date(meeting.meeting_date), 'h:mm a')}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {isPastMeeting(meeting.meeting_date) ? (
                                    <Badge variant="secondary" className="text-xs">Past</Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs">Upcoming</Badge>
                                  )}
                                  {meeting.minutes && meeting.minutes.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="h-3 w-3 mr-1" />
                                      {meeting.minutes.length} notes
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Meeting Details */}
            <div className="lg:col-span-2">
              {selectedMeeting ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{selectedMeeting.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {format(new Date(selectedMeeting.meeting_date), 'EEEE, MMMM d, yyyy')} at{' '}
                            {format(new Date(selectedMeeting.meeting_date), 'h:mm a')}
                          </CardDescription>
                        </div>
                        {isPastMeeting(selectedMeeting.meeting_date) ? (
                          <Badge variant="secondary">Past Meeting</Badge>
                        ) : (
                          <Badge variant="default">Upcoming</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedMeeting.description && (
                        <div>
                          <h4 className="font-medium mb-1">Description</h4>
                          <p className="text-muted-foreground">{selectedMeeting.description}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedMeeting.duration_minutes} minutes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{(selectedMeeting.participants?.length || 0)} participants</span>
                        </div>
                      </div>
                      {selectedMeeting.participants && selectedMeeting.participants.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Participants</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedMeeting.participants.map((p) => (
                              <Badge key={p.user_id} variant="outline">
                                {p.profiles?.full_name || p.profiles?.email || 'Unknown'}
                                {p.attended && <span className="ml-1 text-green-500">✓</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Meeting Minutes */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Meeting Minutes</CardTitle>
                        <CardDescription>Notes and key points from this meeting</CardDescription>
                      </div>
                      <Dialog open={showMinutesDialog} onOpenChange={setShowMinutesDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Notes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Meeting Minutes</DialogTitle>
                            <DialogDescription>Record notes from {selectedMeeting.title}</DialogDescription>
                          </DialogHeader>
                          <Textarea
                            value={newMinutes}
                            onChange={(e) => setNewMinutes(e.target.value)}
                            placeholder="Enter meeting notes, action items, decisions made..."
                            className="min-h-[200px]"
                          />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowMinutesDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddMinutes}>Save Minutes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {selectedMeeting.minutes && selectedMeeting.minutes.length > 0 ? (
                        <div className="space-y-4">
                          {selectedMeeting.minutes.map((minute) => (
                            <div key={minute.id} className="p-4 bg-muted/50 rounded-lg">
                              <p className="whitespace-pre-wrap">{minute.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Added on {format(new Date(minute.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No minutes recorded yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <CardContent className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Select a meeting to view details</p>
                    <p className="text-sm">Choose from the list on the left</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Meetings;
