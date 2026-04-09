import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FloatingButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  variant?: "primary" | "outline";
}

export function FloatingButton({
  label,
  onPress,
  icon,
  variant = "primary",
}: FloatingButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.button,
        isPrimary ? styles.primary : styles.outline,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={isPrimary ? "#1A1A1A" : "#4B5563"}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        style={[
          styles.label,
          isPrimary ? styles.primaryLabel : styles.outlineLabel,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primary: {
    backgroundColor: "#ffd500ff",
  },
  outline: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(200,200,200,0.4)",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  primaryLabel: {
    color: "#1A1A1A",
  },
  outlineLabel: {
    color: "#374151",
  },
});
