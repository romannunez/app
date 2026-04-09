import React from "react";
import { View, Text } from "react-native";
import { CATEGORIES } from "../lib/constants";
import type { CategoryId } from "../lib/constants";

interface CategoryBadgeProps {
  categoryId: CategoryId;
  size?: "sm" | "md" | "lg";
}

export function CategoryBadge({ categoryId, size = "md" }: CategoryBadgeProps) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return null;

  const sizeClasses = {
    sm: "px-2 py-0.5",
    md: "px-3 py-1",
    lg: "px-4 py-2",
  };
  const textClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <View
      className={`rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: cat.color + "20" }}
    >
      <Text
        className={`font-semibold ${textClasses[size]}`}
        style={{ color: cat.color }}
      >
        {cat.label}
      </Text>
    </View>
  );
}
