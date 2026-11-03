import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

// One clock for the focused screen; location requests and mock initialization are independent.
export function useStatusTime() {
  const [nowMs, setNowMs] = useState(Date.now);

  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const updateActivity = (state: string | null | undefined) => {
      stop();
      if (state === "active") {
        setNowMs(Date.now());
        timer = setInterval(() => setNowMs(Date.now()), 1000);
      }
    };

    setNowMs(Date.now());
    updateActivity(AppState.currentState);
    const subscription = AppState.addEventListener("change", updateActivity);
    return () => {
      stop();
      subscription.remove();
    };
  }, []));

  return nowMs;
}
