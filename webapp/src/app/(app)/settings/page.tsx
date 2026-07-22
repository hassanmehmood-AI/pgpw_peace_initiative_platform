"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Community } from "@/components/ui/AffiliationChip";

const communities: { value: Community; label: string }[] = [
  { value: "crip", label: "Crip" },
  { value: "blood", label: "Blood" },
  { value: "latin_king", label: "Latin King" },
  { value: "deceptacon", label: "Deceptacon" },
  { value: "neutral", label: "Independent" },
];

export default function SettingsPage() {
  const { session, updateSession, logout } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.name ?? "");
  const [community, setCommunity] = useState<Community>(session?.community ?? "neutral");
  const [saved, setSaved] = useState(false);

  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(false);
  const [postAnonymously, setPostAnonymously] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!session) return null;

  const saveAccount = () => {
    updateSession({ name: name.trim() || session.name, community });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleDeleteAccount = () => {
    console.log("[mock] account deletion requested", session.id);
    logout();
    router.push("/");
  };

  return (
    <div className="mx-auto w-full max-w-[700px] px-margin-mobile py-stack-lg md:px-margin-desktop">
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-primary">Settings</h1>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Manage your account, notifications, and privacy.
        </p>
      </header>

      {/* Account */}
      <Card className="mb-stack-lg flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Account</h2>

        <label className="flex flex-col gap-2">
          <span className="font-label-bold text-label-bold text-on-surface">Display Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-label-bold text-label-bold text-on-surface">Community Affiliation</span>
          <select
            value={community}
            onChange={(e) => setCommunity(e.target.value as Community)}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md outline-none focus:border-2 focus:border-primary"
          >
            {communities.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={saveAccount}>
            Save Changes
          </Button>
          {saved && (
            <span className="flex items-center gap-1 font-caption text-caption text-primary">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Saved
            </span>
          )}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="mb-stack-lg flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Notifications</h2>
        <ToggleRow
          label="Replies to my posts"
          description="Get notified when someone replies to your feed posts or threads."
          checked={notifyReplies}
          onChange={setNotifyReplies}
        />
        <ToggleRow
          label="Direct messages"
          description="Get notified for new messages in your inbox."
          checked={notifyMessages}
          onChange={setNotifyMessages}
        />
        <ToggleRow
          label="Community announcements"
          description="Platform-wide updates from the AdminTeam."
          checked={notifyAnnouncements}
          onChange={setNotifyAnnouncements}
        />
      </Card>

      {/* Privacy */}
      <Card className="mb-stack-lg flex flex-col gap-stack-md">
        <h2 className="font-headline-md text-headline-md text-primary">Privacy</h2>
        <ToggleRow
          label="Post anonymously by default"
          description="Hide your username on new feed posts and forum threads (you can still override per-post)."
          checked={postAnonymously}
          onChange={setPostAnonymously}
        />
      </Card>

      {/* Danger zone */}
      <Card className="flex flex-col gap-stack-md border-error">
        <h2 className="font-headline-md text-headline-md text-error">Danger Zone</h2>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-label-bold text-label-bold text-primary">Log Out</p>
            <p className="font-caption text-caption text-on-surface-variant">
              End your current session on this device.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Log Out
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-stack-md">
          <div>
            <p className="font-label-bold text-label-bold text-error">Delete Account</p>
            <p className="font-caption text-caption text-on-surface-variant">
              Permanently remove your account and all mock data.
            </p>
          </div>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-error hover:bg-error"
                onClick={handleDeleteAccount}
              >
                Confirm Delete
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="border-error text-error hover:bg-error-container"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete Account
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="font-label-bold text-label-bold text-primary">{label}</p>
        <p className="font-caption text-caption text-on-surface-variant">{description}</p>
      </div>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-outline-variant transition-colors peer-checked:bg-primary" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
