import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Shield, User, ArrowLeft, Moon, Sun, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  user_roles?: {
    role: 'user' | 'admin';
  }[];
  tasks?: {
    id: string;
  }[];
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch task counts for each user
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, user_id');

      if (tasksError) throw tasksError;

      // Combine the data
      const usersWithRolesAndTasks = profilesData?.map(profile => {
        const userRole = rolesData?.find(r => r.user_id === profile.id);
        const userTasks = tasksData?.filter(t => t.user_id === profile.id) || [];
        
        return {
          ...profile,
          user_roles: userRole ? [{ role: userRole.role }] : [],
          tasks: userTasks,
        };
      }) || [];

      setUsers(usersWithRolesAndTasks);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: 'Role updated',
        description: `User role has been changed to ${newRole}`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const getUserRole = (user: UserProfile): 'user' | 'admin' | 'none' => {
    if (!user.user_roles || user.user_roles.length === 0) return 'none';
    return user.user_roles[0].role;
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">User Management</h1>
            <Badge variant="default">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold">All Users</h2>
          </div>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the system
          </p>
        </div>

        {users.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No users found in the system.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((userProfile) => {
              const role = getUserRole(userProfile);
              const taskCount = userProfile.tasks?.length || 0;

              return (
                <Card key={userProfile.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {role === 'admin' ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                        <CardTitle className="text-lg">
                          {userProfile.full_name || 'No Name'}
                        </CardTitle>
                      </div>
                      {userProfile.id === user?.id && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                    <CardDescription className="break-all">
                      {userProfile.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Role:</span>
                      <Select
                        value={role === 'none' ? 'user' : role}
                        onValueChange={(value) => handleRoleChange(userProfile.id, value as 'user' | 'admin')}
                        disabled={userProfile.id === user?.id}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>User</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span>Admin</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Tasks Created:</span>
                      <Badge variant="secondary">{taskCount}</Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(userProfile.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserManagement;
