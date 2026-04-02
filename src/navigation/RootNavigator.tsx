import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { palette } from '../theme/colors';
import { AnalysisLoadingScreen } from '../screens/AnalysisLoadingScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { CookingModeScreen } from '../screens/CookingModeScreen';
import { IngredientsScreen } from '../screens/IngredientsScreen';
import { MealSuggestionsScreen } from '../screens/MealSuggestionsScreen';
import { PantryHubScreen } from '../screens/PantryHubScreen';
import { RecipeScreen } from '../screens/RecipeScreen';
import { RecipesHubScreen } from '../screens/RecipesHubScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.background,
    border: palette.outlineStrong,
    card: palette.background,
    notification: palette.primary,
    primary: palette.primary,
    text: palette.textPrimary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="RecipesHub"
        screenOptions={{
          animation: 'fade',
          animationDuration: 220,
          contentStyle: {
            backgroundColor: palette.background,
          },
          headerShown: false,
        }}
      >
        <Stack.Screen component={RecipesHubScreen} name="RecipesHub" options={{ animation: 'fade' }} />
        <Stack.Screen component={PantryHubScreen} name="PantryHub" options={{ animation: 'fade' }} />
        <Stack.Screen component={SettingsScreen} name="Settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen component={CameraScreen} name="Camera" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen component={AnalysisLoadingScreen} name="AnalysisLoading" options={{ animation: 'fade' }} />
        <Stack.Screen component={IngredientsScreen} name="Ingredients" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen component={MealSuggestionsScreen} name="MealSuggestions" options={{ animation: 'fade' }} />
        <Stack.Screen component={RecipeScreen} name="Recipe" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen component={CookingModeScreen} name="CookingMode" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen component={CompletionScreen} name="Completion" options={{ animation: 'fade' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}