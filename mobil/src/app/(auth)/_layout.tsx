import { Stack } from 'expo-router';
import { useTheme } from '../../theme';


export default function AuthLayout() {

  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
        gestureEnabled: true,
        animationDuration: 250,
      }}
    >
      <Stack.Screen
        name="phone"
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="complete-profile"
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
