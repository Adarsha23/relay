"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";

const STORAGE_KEY = "relay:userId";

type UserContextValue = {
  userId: Id<"users"> | null;
  user: Doc<"users"> | null;
};

const UserContext = createContext<UserContextValue>({ userId: null, user: null });

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const createGuest = useMutation(api.users.createGuest);
  const user = useQuery(api.users.get, userId ? { id: userId } : "skip");

  // Bootstrap a guest identity on first visit; reuse it on return visits.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Id<"users"> | null;
    if (stored) {
      setUserId(stored);
      return;
    }
    createGuest().then((id) => {
      localStorage.setItem(STORAGE_KEY, id);
      setUserId(id);
    });
  }, [createGuest]);

  // Recover if the stored id points at a user that no longer exists (e.g. backend reset).
  useEffect(() => {
    if (userId && user === null) {
      createGuest().then((id) => {
        localStorage.setItem(STORAGE_KEY, id);
        setUserId(id);
      });
    }
  }, [userId, user, createGuest]);

  return (
    <UserContext.Provider value={{ userId, user: user ?? null }}>
      {children}
    </UserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(UserContext);
