/**
 * Profile Page
 *
 * Uses the consistent Centry design system.
 */

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Save,
  X,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { getInitials } from "@/lib/theme";
import { useCurrentUser } from "@/hooks/use-user";
import type { UserProfile } from "@/hooks/use-user";
import { PageHeader } from "@/components/layout/page-header";

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

  const { data: profile, isLoading } = useCurrentUser();

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

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      employee: "bg-[#6B8FB8]/10 text-[#6B8FB8]",
      team_lead: "bg-[#8B7BB8]/10 text-[#8B7BB8]",
      finance: "bg-primary/5 text-primary",
    };
    const style = styles[role] || "bg-muted text-foreground";
    const label = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
        {label}
      </span>
    );
  };

  if (isLoading) {
    return <LoadingState fullPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))]">
        <PageHeader title="Profile" />
        <div className="px-6 py-6">
          <EmptyState
            icon={User}
            title="Profile not found"
            description="Unable to load your profile information"
          />
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
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Profile"
        subtitle="Manage your account details"
        breadcrumbs={[
          { label: "Account", href: "/account/profile" },
          { label: "Profile" },
        ]}
      >
        {!isEditing ? (
          <Button
            size="sm"
            onClick={handleEdit}
            className="h-8 bg-primary hover:bg-primary/90 btn-press"
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
              className="h-8 btn-press"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 bg-primary hover:bg-primary/90 btn-press"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-medium text-sm">
                {getInitials(profile.full_name || profile.username)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {profile.full_name || profile.username}
                </p>
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(profile.role)}
              {profile.erp_provider && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#8B7BB8]/10 text-[#8B7BB8]">
                  {profile.erp_provider.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Organizations:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-primary/10 text-primary">
                {profile.organizations_count}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Joined:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
                {format(new Date(profile.date_joined), "MMM yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors btn-press ${
                  activeTab === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 animate-fade-in-up">
        {activeTab === 'personal' && (
          <div className="bg-card rounded-xl border border-border/80 shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Personal Information</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Update your personal details and contact information
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm text-muted-foreground">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className="h-9 bg-muted border-border"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                      <User className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-sm text-foreground">{profile.first_name || "-"}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm text-muted-foreground">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className="h-9 bg-muted border-border"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                      <User className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-sm text-foreground">{profile.last_name || "-"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 bg-muted border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-sm text-foreground">{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm text-muted-foreground">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+256 700 000 000"
                    className="h-9 bg-muted border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                    <Phone className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-sm text-foreground">{profile.phone_number || "-"}</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="profile_image" className="text-sm text-muted-foreground">Profile Image URL</Label>
                  <Input
                    id="profile_image"
                    type="url"
                    value={formData.profile_image}
                    onChange={(e) =>
                      setFormData({ ...formData, profile_image: e.target.value })
                    }
                    placeholder="https://example.com/image.jpg"
                    className="h-9 bg-muted border-border"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div className="bg-card rounded-xl border border-border/80 shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Organizations</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Organizations you are a member of
              </p>
            </div>
            <div className="divide-y divide-border">
              {profile.primary_organization && (
                <div className="px-6 py-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          {profile.primary_organization.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          @{profile.primary_organization.slug}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      Primary
                    </span>
                  </div>
                </div>
              )}

              {profile.organizations
                .filter((org) => org.id !== profile.primary_organization?.id)
                .map((org) => (
                  <div key={org.id} className="px-6 py-4 row-interactive">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{org.name}</h3>
                        <p className="text-xs text-muted-foreground">@{org.slug}</p>
                      </div>
                    </div>
                  </div>
                ))}

              {profile.organizations.length === 0 && (
                <EmptyState
                  icon={Building2}
                  title="No organizations yet"
                  description="You haven't joined any organizations"
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border/80 shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Security Settings</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your password and security preferences
                </p>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-4 flex items-center justify-between row-interactive">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Password</h3>
                      <p className="text-xs text-muted-foreground">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 btn-press">
                    Change Password
                  </Button>
                </div>

                <Link
                  href="/account/two-factor"
                  className="px-6 py-4 flex items-center justify-between row-interactive"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Two-Factor Authentication</h3>
                      <p className="text-xs text-muted-foreground">Manage your 2FA settings</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 btn-press">
                    Configure
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border/80 shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">Account Information</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="text-sm font-medium text-foreground">@{profile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">User ID</span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{profile.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Created</span>
                  <span className="text-sm font-medium text-foreground">
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
