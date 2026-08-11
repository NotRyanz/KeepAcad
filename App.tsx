import 'react-native-gesture-handler';
import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from './context/AppContext';
import { AIProvider } from './context/AIContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import TabBar from './components/TabBar';
import CalendarScreen from './screens/CalendarScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import RoutineScreen from './screens/RoutineScreen';
import LibraryScreen from './screens/LibraryScreen';
import SubjectDetailScreen from './screens/SubjectDetailScreen';
import TasksScreen from './screens/TasksScreen';
import AssistantScreen from './screens/AssistantScreen';

const Tab = createBottomTabNavigator();
const LibraryStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} />
      <LibraryStack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
    </LibraryStack.Navigator>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="CalendarTab" component={CalendarScreen} />
      <Tab.Screen name="ScheduleTab" component={ScheduleScreen} />
      <Tab.Screen name="RoutineTab" component={RoutineScreen} />
      <Tab.Screen name="LibraryTab" component={LibraryStackNavigator} />
      <Tab.Screen name="TasksTab" component={TasksScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { scheme, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.bg,
        border: colors.hairline,
        text: colors.ink,
        primary: colors.accentBlue,
      },
    };
  }, [scheme, colors]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={TabsNavigator} />
        <RootStack.Screen
          name="Assistant"
          component={AssistantScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppProvider>
              <AIProvider>
                <RootNavigator />
              </AIProvider>
            </AppProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
