import {Stack} from 'expo-router';

export const unstable_settings = {anchor: 'index'};

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {backgroundColor: '#f4f2ed'},
        headerTintColor: '#172c32',
        contentStyle: {backgroundColor: '#f4f2ed'},
      }}
    >
      <Stack.Screen name="index" options={{title: 'Media styles'}} />
      <Stack.Screen name="details" options={{title: 'Details'}} />
    </Stack>
  );
}
