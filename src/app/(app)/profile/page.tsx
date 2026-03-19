"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { User, Bell, Monitor, Save, Loader2, Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTheme } from "next-themes";

interface UserPreferences {
  default_model: string;
  timezone: string;
  notifications_email: boolean;
  notifications_in_app: boolean;
  notifications_run_completed: boolean;
  notifications_run_failed: boolean;
  notifications_budget_alerts: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  default_model: "claude-sonnet-4-20250514",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications_email: true,
  notifications_in_app: true,
  notifications_run_completed: false,
  notifications_run_failed: true,
  notifications_budget_alerts: true,
};

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

export default function ProfilePage() {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs({ ...DEFAULT_PREFS, ...data });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        toast.success("Preferences saved");
      } else {
        toast.error("Failed to save preferences");
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof UserPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Profile & Preferences
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and notification preferences
        </p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="" className="h-12 w-12 rounded-full" />
            )}
            <div>
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[
              { value: "light", icon: Sun, label: "Light" },
              { value: "dark", icon: Moon, label: "Dark" },
              { value: "system", icon: Laptop, label: "System" },
            ].map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={theme === value ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(value)}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Default model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Model</CardTitle>
          <CardDescription>
            Default model for new agents. Individual agents can override this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {MODEL_OPTIONS.map((model) => (
              <Button
                key={model.value}
                variant={prefs.default_model === model.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPrefs((p) => ({ ...p, default_model: model.value }))}
              >
                {model.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
          <CardDescription>Used for scheduling and analytics display</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={prefs.timezone}
            onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
            placeholder="America/New_York"
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "notifications_email" as const, label: "Email notifications", desc: "Receive alerts via email" },
            { key: "notifications_in_app" as const, label: "In-app notifications", desc: "Show in the notification center" },
            { key: "notifications_run_failed" as const, label: "Run failures", desc: "When an agent or cluster run fails" },
            { key: "notifications_run_completed" as const, label: "Run completions", desc: "When runs complete successfully" },
            { key: "notifications_budget_alerts" as const, label: "Budget alerts", desc: "When budget thresholds are reached" },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Button
                variant={prefs[key] ? "default" : "outline"}
                size="sm"
                onClick={() => togglePref(key)}
              >
                {prefs[key] ? "On" : "Off"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={savePrefs} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Preferences
      </Button>
    </div>
  );
}
