import { useCallback, useEffect, useState } from "react";
import { getPublicSettings, getCachedSettings, subscribeToSettings } from "@/utils/siteSettings";

export default function usePublicSettings() {
  const [settings, setSettings] = useState(() => getCachedSettings());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSettings((s) => {
      if (active) setSettings(s);
    });

    getPublicSettings()
      .then((s) => { if (active) setSettings(s); })
      .catch(() => {});

    const handleUpdated = () => {
      getPublicSettings({ force: true })
        .then((s) => { if (active) setSettings(s); })
        .catch(() => {});
    };
    window.addEventListener("settingsUpdated", handleUpdated);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("settingsUpdated", handleUpdated);
    };
  }, []);

  const refresh = useCallback(() => getPublicSettings({ force: true }).catch(() => null), []);

  return { settings, refresh };
}
