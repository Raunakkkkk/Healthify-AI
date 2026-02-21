import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Lock, Calendar, Save, Loader2, Shield, KeyRound } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.get("/user/profile").then(({ data }) => {
      setName(data.name);
      setEmail(data.email);
      if (data.createdAt) setCreatedAt(data.createdAt);
    }).catch(() => {});
  }, []);

  const profileChanged = name !== user?.name || email !== user?.email;
  const profileValid = name.trim().length >= 2 && email.includes("@");

  const pwValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/user/profile", { name: name.trim(), email: email.trim() });
      setUser(data);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setSavingPw(true);
    try {
      await api.put("/user/profile", { currentPassword, newPassword });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — avatar card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <p className="mt-4 truncate text-lg font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>

              {createdAt && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Joined {format(new Date(createdAt), "MMM d, yyyy")}
                </div>
              )}

              <Separator className="my-4" />

              <div className="w-full space-y-2 text-left text-sm">
                <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Password protected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — forms */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={!profileChanged || !profileValid || saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pw">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New Password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirm New Password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={!pwValid || savingPw}
                  variant="outline"
                  className="gap-2"
                >
                  {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
