"use client";

import { createContext, useContext } from "react";
import { travoUnitForSlideId } from "./config";

const TravoUnitContext = createContext<number | null>(null);

export function TravoSlideProvider({ slideId, children }: { slideId: string; children: React.ReactNode }) {
  const unit = travoUnitForSlideId(slideId);
  return <TravoUnitContext.Provider value={unit}>{children}</TravoUnitContext.Provider>;
}

export function useTravoUnit() {
  return useContext(TravoUnitContext);
}
