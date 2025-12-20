// src/navigation/AppNavigator.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import LibraryScreen from "../screens/LibraryScreen";
import { MusicProvider } from "../context/MusicContext";
import MiniPlayer from "../components/MiniPlayer";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <MusicProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#121212",
              borderTopColor: "#282828",
              height: 60,
              paddingBottom: 10,
            },
            tabBarActiveTintColor: "white",
            tabBarInactiveTintColor: "gray",
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: any;

              if (route.name === "Home") {
                iconName = focused ? "home" : "home-outline";
              } else if (route.name === "Search") {
                iconName = focused ? "search" : "search-outline";
              } else if (route.name === "Library") {
                iconName = focused ? "library" : "library-outline";
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Search" component={SearchScreen} />
          <Tab.Screen name="Library" component={LibraryScreen} />
        </Tab.Navigator>
        <MiniPlayer />
      </NavigationContainer>
    </MusicProvider>
  );
}
