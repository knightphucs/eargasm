import React from "react";
import { MusicProvider } from "../context/MusicContext";
import TabsWithPlayer from "./TabsWithPlayer";

export default function AppTabs() {
  return (
    <MusicProvider>
      <TabsWithPlayer />
    </MusicProvider>
  );
}
