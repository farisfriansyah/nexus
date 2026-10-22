"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WidgetDrawer({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="widget-drawer">
          <div className="drawer-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup detail"><X size={18} /></Button></Dialog.Close></div>
          <Dialog.Description className="muted">Detail dan riwayat widget.</Dialog.Description>
          {children ?? <p className="muted">Belum ada data yang tersedia.</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
