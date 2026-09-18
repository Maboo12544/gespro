"use client";

import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/components/demo-storage";

export type PosLayout = "option1" | "option2" | "option3";

export type ColumnConfig = { title: string; groups: string[]; showTotal: boolean; icon: "dice" | "gauge" | "users" };

export const layoutColumns: Record<PosLayout, ColumnConfig[]> = {
  option1: [
    { title: "DIRECTO", groups: ["DIRECTO"], showTotal: true, icon: "gauge" },
    { title: "PALÉ", groups: ["PALÉ"], showTotal: true, icon: "users" },
    { title: "CASH 3", groups: ["CASH 3"], showTotal: true, icon: "dice" },
    { title: "PLAY 4", groups: ["PLAY 4"], showTotal: true, icon: "dice" },
    { title: "PICK 5", groups: ["PICK 5"], showTotal: true, icon: "dice" },
  ],
  option2: [
    { title: "STRAIGHT", groups: ["DIRECTO"], showTotal: true, icon: "gauge" },
    { title: "PALE", groups: ["PALÉ"], showTotal: true, icon: "users" },
    { title: "PICK 3", groups: ["CASH 3"], showTotal: true, icon: "dice" },
    { title: "PICK 4 & 5", groups: ["PLAY 4", "PICK 5"], showTotal: true, icon: "dice" },
  ],
  option3: [
    { title: "DIRECTO", groups: ["DIRECTO"], showTotal: true, icon: "gauge" },
    { title: "PALE & TRIPLETA", groups: ["PALÉ", "TRIPLETA"], showTotal: true, icon: "users" },
    { title: "CASH 3", groups: ["CASH 3"], showTotal: true, icon: "dice" },
    { title: "PLAY 4 & PICK 5", groups: ["PLAY 4", "PICK 5"], showTotal: true, icon: "dice" },
  ],
};

const layoutLabels: Record<PosLayout, string> = {
  option1: "GesPro V1",
  option2: "GesPro V2",
  option3: "GesPro V3",
};

export function usePosLayout() {
  return useDemoState<PosLayout>("gespro-workspace.tsx:posLayout", "option1");
}

export function PosLayoutSwitcher({ value, onChange }: { value: PosLayout; onChange: (v: PosLayout) => void }) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (!desktop) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Chanje modèl ekran">
          <LayoutGrid size={18} />
          <span className="pos-layout-label">{layoutLabels[value]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(layoutLabels) as PosLayout[]).map(key => (
          <DropdownMenuItem key={key} onSelect={() => onChange(key)} className={value === key ? "font-bold" : ""}>
            {layoutLabels[key]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
