"use client";

import { signOutAction } from "@/app/actions";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, email }: { name?: string | null; email: string }) {
  return (
    <div className="user-menu">
      <span className="avatar" aria-hidden="true">{(name ?? email).slice(0, 1).toUpperCase()}</span>
      <span className="user-label">{name ?? email}</span>
      <Button variant="ghost" size="sm" aria-label="Keluar" onClick={() => void signOutAction()}>
        <LogOut size={16} /> <span className="logout-label">Keluar</span>
      </Button>
    </div>
  );
}
