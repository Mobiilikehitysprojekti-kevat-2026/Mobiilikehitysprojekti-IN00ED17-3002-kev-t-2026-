import type { AnalyzeResponse, IngredientDTO, RecipeDTO } from '../types/api';
import type { CapturedImage } from '../types/image';

export type RootStackParamList = {
  RecipesHub: undefined;
  PantryHub: undefined;
  Settings: undefined;
  Camera: undefined;
  AnalysisLoading: { image: CapturedImage };
  Ingredients: { analysis: AnalyzeResponse; sourceImageUri: string };
  MealSuggestions: {
    analysis: AnalyzeResponse;
    selectedIngredients: IngredientDTO[];
    sourceImageUri: string;
  };
  Recipe: {
    availableIngredients: IngredientDTO[];
    recipe: RecipeDTO;
    sourceImageUri?: string;
  };
  CookingMode: {
    recipe: RecipeDTO;
    sourceImageUri?: string;
  };
  Completion: {
    recipe: RecipeDTO;
    sourceImageUri?: string;
  };
};