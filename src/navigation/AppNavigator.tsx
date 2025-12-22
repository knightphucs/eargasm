import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Screens
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import LibraryScreen from "../screens/LibraryScreen";
import PlaylistDetailScreen from "../screens/PlaylistDetailScreen";
import LikedSongsScreen from "../screens/LikedSongsScreen";

// Components & Context
import { MusicProvider, useMusic } from "../context/MusicContext";
import MiniPlayer from "../components/MiniPlayer";
import FullPlayer from "../components/FullPlayer";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
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
          let iconName: any = "home";
          if (route.name === "Home")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Search")
            iconName = focused ? "search" : "search-outline";
          else if (route.name === "Library")
            iconName = focused ? "library" : "library-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

const RootNavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#121212" },
          headerTintColor: "white",
        }}
      >
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ title: "Profile" }}
        />
        <Stack.Screen
          name="LikedSongs"
          component={LikedSongsScreen}
          options={{ headerShown: false, title: "Liked Songs" }}
        />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{ headerShown: false, title: "Playlist" }}
        />
      </Stack.Navigator>

      {/* Render Components Globally */}
      <MiniPlayer />

      {/* Conditionally Render FullPlayer */}
      <FullPlayerWrapper />
    </NavigationContainer>
  );
};

function FullPlayerWrapper() {
  const { isExpanded } = useMusic();
  return isExpanded ? <FullPlayer /> : null;
}

export default function AppNavigator() {
  return (
    <MusicProvider>
      <RootNavigation />
    </MusicProvider>
  );
}
