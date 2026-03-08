import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1a73e8',
      headerShown: true,
      // This sets the top heading to only arogya_app
      headerTitle: "arogya_app", 
      headerTitleStyle: { 
        fontWeight: 'bold',
        fontSize: 22,
        color: '#1a73e8' 
      },
      tabBarStyle: { height: 60, paddingBottom: 10 }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan Eye',
          tabBarIcon: ({ color }) => <Ionicons name="camera" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Records',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      {/* IMPORTANT: If there was a Tabs.Screen for "explore" here, 
          it is now gone, which removes the button from the bottom bar.
      */}
    </Tabs>
  );
}