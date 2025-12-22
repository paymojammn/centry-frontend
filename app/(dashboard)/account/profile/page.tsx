"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Camera,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  phone_number: string;
  profile_image: string;
  is_organization_user: boolean;
  erp_provider: string;
  organizations_count: number;
  date_joined: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  primary_organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    profile_image: "",
  });

  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      console.log('🔍 Fetching user profile...');
      try {
        const data = await api.get<UserProfile>("/api/v1/users/me/");
        console.log('✓ Profile data received:', data);
        return data;
      } catch (err) {
        console.error('✗ Profile fetch error:', err);
        throw err;
      }
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      api.patch("/api/v1/users/me/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    },
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: profile.phone_number,
        profile_image: profile.profile_image,
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      profile_image: "",
    });
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      employee: { color: "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200", label: "Employee" },
      team_lead: { color: "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-200", label: "Team Lead" },
      finance: { color: "bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200", label: "Finance" },
    };
    const badge = badges[role] || { color: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200", label: role };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-500">Unable to load your profile</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        {/* Header with Avatar */}
        <Card className="border border-gray-100 shadow-xl rounded-2xl overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10"></div>
          </div>
          <div className="px-8 pb-8">
            <div className="flex items-end justify-between -mt-20 mb-6">
              <div className="flex items-end gap-6">
                <div className="relative">
                  <Avatar className="h-40 w-40 border-4 border-white shadow-2xl ring-4 ring-[#638C80]/20">
                    <AvatarImage src={profile.profile_image} alt={profile.full_name} />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-[#638C80] to-[#547568] text-white">
                      {getInitials(profile.full_name || profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute bottom-2 right-2 h-10 w-10 rounded-full p-0 bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] shadow-lg"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                <div className="mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-gray-600 mt-2 text-lg">@{profile.username}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {getRoleBadge(profile.role)}
                    {profile.erp_provider && (
                      <Badge className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-200">
                        {profile.erp_provider.toUpperCase()} Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                {!isEditing ? (
                  <Button
                    onClick={handleEdit}
                    className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-md hover:shadow-lg transition-all"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#638C80] to-[#547568] p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Organizations</div>
                  <div className="text-4xl font-bold text-white">{profile.organizations_count}</div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Member Since</div>
                  <div className="text-4xl font-bold text-white">
                    {format(new Date(profile.date_joined), "MMM yyyy")}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Status</div>
                  <div className="text-4xl font-bold text-white">Active</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="personal" className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
            <TabsList className="bg-gray-50 p-1.5 rounded-xl w-full grid grid-cols-3 gap-1">
              <TabsTrigger
                value="personal"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
              >
                Personal Info
              </TabsTrigger>
              <TabsTrigger
                value="organizations"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
              >
                Organizations
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
              >
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Update your personal details and contact information
                </p>
              </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profile.first_name || "-"}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profile.last_name || "-"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+256 700 000 000"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{profile.phone_number || "-"}</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="profile_image">Profile Image URL</Label>
                  <Input
                    id="profile_image"
                    type="url"
                    value={formData.profile_image}
                    onChange={(e) =>
                      setFormData({ ...formData, profile_image: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-xl font-semibold text-gray-900">Organizations</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Organizations you are a member of
                </p>
              </div>
            <div className="p-6 space-y-4">
              {profile.primary_organization && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#638C80] to-[#547568] p-6 shadow-lg hover:shadow-xl transition-all">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {profile.primary_organization.name}
                        </h3>
                        <p className="text-sm text-white/80 mt-1">
                          @{profile.primary_organization.slug}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">Primary</Badge>
                  </div>
                </div>
              )}

              {profile.organizations
                .filter((org) => org.id !== profile.primary_organization?.id)
                .map((org) => (
                  <Card key={org.id} className="p-5 border border-gray-200 rounded-2xl hover:border-[#638C80]/30 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border border-gray-200">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{org.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">@{org.slug}</p>
                      </div>
                    </div>
                  </Card>
                ))}

              {profile.organizations.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No organizations yet
                  </h3>
                  <p className="text-gray-500">You haven't joined any organizations</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your password and security preferences
                </p>
              </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-2xl hover:border-[#638C80]/30 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5 rounded-xl">
                    <Shield className="h-6 w-6 text-[#638C80]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Password</h3>
                    <p className="text-sm text-gray-600 mt-1">Last changed 3 months ago</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-[#638C80] text-[#638C80] hover:bg-[#638C80]/10 hover:shadow-sm transition-all"
                >
                  Change Password
                </Button>
              </div>

              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mt-1">Not enabled</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:shadow-sm transition-all"
                >
                  Enable 2FA
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Username</span>
                <span className="text-sm font-medium text-gray-900">@{profile.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-sm font-mono text-gray-900">{profile.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {format(new Date(profile.date_joined), "MMMM dd, yyyy")}
                </span>
              </div>
            </div>
          </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
