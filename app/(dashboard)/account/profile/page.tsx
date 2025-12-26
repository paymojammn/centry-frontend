"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Save,
  X,
  CheckCircle,
  Loader2,
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
  const [activeTab, setActiveTab] = useState<'personal' | 'organizations' | 'security'>('personal');
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    profile_image: "",
  });

  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const data = await api.get<UserProfile>("/api/v1/users/me/");
      return data;
    },
  });

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
    const styles: Record<string, string> = {
      employee: "bg-blue-50 text-blue-700",
      team_lead: "bg-purple-50 text-purple-700",
      finance: "bg-green-50 text-green-700",
    };
    const style = styles[role] || "bg-gray-100 text-gray-700";
    const label = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'personal', label: 'Personal Info' },
    { value: 'organizations', label: 'Organizations' },
    { value: 'security', label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
            {!isEditing ? (
              <Button
                size="sm"
                onClick={handleEdit}
                className="h-9 bg-[#638C80] hover:bg-[#547568]"
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="h-9 bg-[#638C80] hover:bg-[#547568]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                {getInitials(profile.full_name || profile.username)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name || profile.username}
                </p>
                <p className="text-xs text-gray-500">@{profile.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(profile.role)}
              {profile.erp_provider && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                  {profile.erp_provider.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Organizations:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                {profile.organizations_count}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Joined:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {format(new Date(profile.date_joined), "MMM yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#638C80] text-[#638C80]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {activeTab === 'personal' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-500 mt-1">
                Update your personal details and contact information
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm text-gray-600">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="h-9 bg-gray-50 border-gray-200"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{profile.first_name || "-"}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm text-gray-600">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="h-9 bg-gray-50 border-gray-200"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{profile.last_name || "-"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-gray-600">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 bg-gray-50 border-gray-200"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm text-gray-600">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+256 700 000 000"
                    className="h-9 bg-gray-50 border-gray-200"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{profile.phone_number || "-"}</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="profile_image" className="text-sm text-gray-600">Profile Image URL</Label>
                  <Input
                    id="profile_image"
                    type="url"
                    value={formData.profile_image}
                    onChange={(e) =>
                      setFormData({ ...formData, profile_image: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="h-9 bg-gray-50 border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Organizations</h2>
              <p className="text-xs text-gray-500 mt-1">
                Organizations you are a member of
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {profile.primary_organization && (
                <div className="px-6 py-4 bg-[#638C80]/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#638C80] flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {profile.primary_organization.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          @{profile.primary_organization.slug}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#638C80]/10 text-[#638C80]">
                      Primary
                    </span>
                  </div>
                </div>
              )}

              {profile.organizations
                .filter((org) => org.id !== profile.primary_organization?.id)
                .map((org) => (
                  <div key={org.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{org.name}</h3>
                        <p className="text-xs text-gray-500">@{org.slug}</p>
                      </div>
                    </div>
                  </div>
                ))}

              {profile.organizations.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No organizations yet</p>
                  <p className="text-xs text-gray-400 mt-1">You haven't joined any organizations</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">Security Settings</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Manage your password and security preferences
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Password</h3>
                      <p className="text-xs text-gray-500">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8">
                    Change Password
                  </Button>
                </div>

                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-xs text-gray-500">Not enabled</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8">
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-medium text-gray-900">Account Information</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Username</span>
                  <span className="text-sm font-medium text-gray-900">@{profile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">User ID</span>
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{profile.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Account Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(profile.date_joined), "MMMM dd, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
