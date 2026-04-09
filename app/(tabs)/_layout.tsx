import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ITEMS: {
  name: string;
  title: string;
  icon: IoniconsName;
  iconOutline: IoniconsName;
}[] = [
    { name: "index", title: "Inicio", icon: "home", iconOutline: "home-outline" },
    {
      name: "vibes",
      title: "Vibes",
      icon: "film",
      iconOutline: "film-outline",
    },
    {
      name: "descubrir",
      title: "Descubrir",
      icon: "search",
      iconOutline: "search-outline",
    },
    {
      name: "chats",
      title: "Chats",
      icon: "chatbubble",
      iconOutline: "chatbubble-outline",
    },
    {
      name: "perfil",
      title: "Perfil",
      icon: "person",
      iconOutline: "person-outline",
    },
  ];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ebb800ff",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 30 : 16,
          marginHorizontal: 16,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: "rgba(255,255,255,0.75)",
          borderTopWidth: 0,
          borderRadius: 25,
          borderWidth: 1,
          borderColor: "rgba(200,200,200,0.3)",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={60}
              tint="light"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 25, overflow: "hidden" },
              ]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(255,255,255,0.85)",
                  borderRadius: 25,
                },
              ]}
            />
          ),
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.icon : tab.iconOutline}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
