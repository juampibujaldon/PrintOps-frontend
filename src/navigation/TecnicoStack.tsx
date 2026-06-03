// src/navigation/TecnicoStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';

export type TecnicoStackParamList = {
  TecnicoHome: undefined;
};

const Stack = createNativeStackNavigator<TecnicoStackParamList>();

export default function TecnicoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TecnicoHome"
        component={HomeScreen}
        options={{ title: 'Panel Técnico' }}
      />
    </Stack.Navigator>
  );
}
