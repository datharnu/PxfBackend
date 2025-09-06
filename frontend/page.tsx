// components/BottomNav.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";

interface ParticipantItem {
  id: string;
  fullname: string;
  uploadsCount?: number;
  imagesCount?: number;
  videosCount?: number;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  participants?: ParticipantItem[];
  onSelectUser?: (user: ParticipantItem) => void;
  allCounts?: { photos: number; videos: number };
  myCounts?: { photos: number; videos: number };
}

export function BottomNav({
  activeTab,
  onTabChange,
  participants = [],
  onSelectUser,
  allCounts,
  myCounts,
}: BottomNavProps) {
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // no-op

  const handleFilterSelect = (filterValue: string) => {
    onTabChange(filterValue);
    setShowFilterDrawer(false);
  };

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-700">
        <div className="flex justify-around items-center py-3">
          <button
            className={`flex flex-col items-center px-4 py-2 ${
              activeTab === "all" ? "text-white" : "text-[#aaaaaa]"
            }`}
            onClick={() => onTabChange("all")}
          >
            <span className="text-sm font-medium">All</span>
            {activeTab === "all" && (
              <div className="w-1 h-1 bg-white rounded-full mt-1"></div>
            )}
          </button>

          <button
            className={`flex flex-col items-center px-4 py-2 ${
              activeTab === "my" ? "text-white" : "text-[#aaaaaa]"
            }`}
            onClick={() => onTabChange("my")}
          >
            <span className="text-sm font-medium">My PXF</span>
            {activeTab === "my" && (
              <div className="w-1 h-1 bg-white rounded-full mt-1"></div>
            )}
          </button>

          <button
            className={`flex flex-col items-center px-4 py-2 ${
              activeTab === "choose" ? "text-white" : "text-[#aaaaaa]"
            }`}
            onClick={() => setShowFilterDrawer(true)}
          >
            <span className="text-sm font-medium">Choose a PXF</span>
            {activeTab === "choose" && (
              <div className="w-1 h-1 bg-white rounded-full mt-1"></div>
            )}
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setShowFilterDrawer(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-lg">Choose a PXF</h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Participants List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <button
                className={`w-full text-left py-3 px-4 rounded-lg ${
                  activeTab === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                }`}
                onClick={() => {
                  handleFilterSelect("all");
                }}
              >
                <div className="flex items-center justify-between">
                  <span>All</span>
                  {allCounts && (
                    <span className="text-xs text-gray-400">
                      {allCounts.photos} photos · {allCounts.videos} videos
                    </span>
                  )}
                </div>
              </button>
              <button
                className={`w-full text-left py-3 px-4 rounded-lg ${
                  activeTab === "my"
                    ? "bg-blue-600 text-white"
                    : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                }`}
                onClick={() => {
                  handleFilterSelect("my");
                }}
              >
                <div className="flex items-center justify-between">
                  <span>My PXF</span>
                  {myCounts && (
                    <span className="text-xs text-gray-400">
                      {myCounts.photos} photos · {myCounts.videos} videos
                    </span>
                  )}
                </div>
              </button>
              {participants.map((participant) => (
                <button
                  key={participant.id}
                  className={`w-full text-left py-3 px-4 rounded-lg ${
                    activeTab === `user:${participant.id}`
                      ? "bg-blue-600 text-white"
                      : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                  }`}
                  onClick={() => {
                    onTabChange(`user:${participant.id}`);
                    if (onSelectUser) {
                      onSelectUser(participant);
                    }
                    setShowFilterDrawer(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {participant.fullname.split(" ")[0]}
                      {"'"}s PXF
                    </span>
                    <span className="text-xs text-gray-400">
                      {participant.imagesCount ?? 0} photos ·{" "}
                      {participant.videosCount ?? 0} videos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type MediaItem = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  createdAt: string;
};

function useEventIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const eventId = url.searchParams.get("eventId");
    return eventId;
  } catch {
    return null;
  }
}

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function EventMediaPage() {
  const eventId = useEventIdFromUrl();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [participants, setParticipants] = useState<
    {
      id: string;
      fullname: string;
      uploadsCount?: number;
      imagesCount?: number;
      videosCount?: number;
    }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<null | {
    id: string;
    fullname: string;
  }>(null);
  const [userUploads, setUserUploads] = useState<MediaItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch participants when eventId is available
  useEffect(() => {
    if (!eventId) return;
    setLoadingParticipants(true);
    setError(null);
    fetch(`/media/event/${eventId}/participants?page=1&limit=50`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            (await r.json()).message || "Failed to load participants"
          );
        return r.json();
      })
      .then((data) => {
        const list = (data.participants || []).map((p: any) => ({
          id: p.user?.id || p.uploadedBy,
          fullname: p.user?.fullname || "Unknown User",
          uploadsCount: p.uploadCount ? Number(p.uploadCount) : 0,
        }));
        setParticipants(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingParticipants(false));
  }, [eventId]);

  // Handle selecting a user from the drawer
  const handleSelectUser = (user: { id: string; fullname: string }) => {
    setSelectedUser(user);
    setActiveTab(`user:${user.id}`);
  };

  // Fetch uploads for selected user
  useEffect(() => {
    if (!eventId) return;
    if (!activeTab.startsWith("user:")) return;
    const userId = activeTab.split(":")[1];
    if (!userId) return;

    setLoadingUploads(true);
    setError(null);
    fetch(`/media/event/${eventId}/user/${userId}?page=1&limit=50`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error((await r.json()).message || "Failed to load uploads");
        return r.json();
      })
      .then((data) => {
        setUserUploads(data.uploads || []);
        if (data.user && (!selectedUser || data.user.id !== selectedUser.id)) {
          setSelectedUser({ id: data.user.id, fullname: data.user.fullname });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingUploads(false));
  }, [activeTab, eventId]);

  const userFirstName = useMemo(() => {
    if (!selectedUser?.fullname) return "";
    return selectedUser.fullname.split(" ")[0];
  }, [selectedUser]);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold mb-4">Event Media</h1>
        {!eventId && (
          <div className="text-red-400 mb-4">
            Missing eventId in URL (?eventId=...)
          </div>
        )}

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {/* Content Area */}
        {activeTab.startsWith("user:") ? (
          <div>
            <h2 className="text-lg font-semibold mb-3">
              {userFirstName ? `${userFirstName}'s PXF` : "User's PXF"}
            </h2>
            {loadingUploads ? (
              <div className="text-gray-400">Loading uploads…</div>
            ) : userUploads.length === 0 ? (
              <div className="text-gray-400">No uploads yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {userUploads.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-square overflow-hidden rounded-md bg-[#111]"
                  >
                    {m.mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.mediaUrl}
                        alt="upload"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={m.mediaUrl}
                        className="w-full h-full object-cover"
                        controls={false}
                        muted
                        playsInline
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400">
            {activeTab === "all" && (
              <div>Select "Choose a PXF" to view by user.</div>
            )}
            {activeTab === "my" && (
              <div>"My PXF" view not implemented yet.</div>
            )}
          </div>
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        participants={participants}
        onSelectUser={handleSelectUser}
      />

      {/* Participants loading indicator near bottom */}
      {loadingParticipants && (
        <div
          className={classNames(
            "fixed bottom-16 left-0 right-0 mx-auto max-w-sm text-center text-xs text-gray-400"
          )}
        >
          Loading participants…
        </div>
      )}
    </div>
  );
}
