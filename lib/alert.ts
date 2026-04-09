import { Alert, Platform } from "react-native";

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

/**
 * Cross-platform alert that works on both native (Alert.alert) and web (window.confirm/alert).
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  if (!buttons || buttons.length === 0) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  if (buttons.length === 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    buttons[0].onPress?.();
    return;
  }

  // Two buttons: use confirm (cancel = first cancel-style button, confirm = other)
  const cancelBtn = buttons.find((b) => b.style === "cancel") ?? buttons[0];
  const confirmBtn = buttons.find((b) => b !== cancelBtn) ?? buttons[1];

  const result = window.confirm(
    message ? `${title}\n\n${message}` : title
  );

  if (result) {
    confirmBtn?.onPress?.();
  } else {
    cancelBtn?.onPress?.();
  }
}
