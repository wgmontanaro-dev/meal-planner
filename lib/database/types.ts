import type {
  Cuisine,
  DietType,
  PrepTimeCategory,
  PreparationType,
  StorageType,
  TernaryCategory,
} from "@/lib/constants/categories";

// Row shapes as stored in Postgres (snake_case), matching
// supabase/migrations/20260826201547_initial_schema.sql.

export type RecipeRow = {
  id: string;
  title: string;
  summary_description: string | null;
  source_url: string | null;
  prep_time_category: PrepTimeCategory | null;
  cuisine: Cuisine | null;
  storage_type: StorageType | null;
  diet_type: DietType | null;
  child_friendly: TernaryCategory | null;
  weeknight_favourite: TernaryCategory | null;
  preparation_type: PreparationType | null;
  instructions: string | null;
  image_storage_path: string | null;
  image_original_name: string | null;
  image_mime_type: string | null;
  created_at: string;
  updated_at: string;
};

export type IngredientRow = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Domain shapes used throughout the application (camelCase), per SPEC.md
// sections 9.1 and 9.2.

export type Recipe = {
  id: string;
  title: string;
  summaryDescription: string | null;
  sourceUrl: string | null;
  prepTimeCategory: PrepTimeCategory | null;
  cuisine: Cuisine | null;
  storageType: StorageType | null;
  dietType: DietType | null;
  childFriendly: TernaryCategory | null;
  weeknightFavourite: TernaryCategory | null;
  preparationType: PreparationType | null;
  instructions: string | null;
  imageStoragePath: string | null;
  imageOriginalName: string | null;
  imageMimeType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ingredient = {
  id: string;
  recipeId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RecipeWithIngredients = Recipe & { ingredients: Ingredient[] };

export function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    summaryDescription: row.summary_description,
    sourceUrl: row.source_url,
    prepTimeCategory: row.prep_time_category,
    cuisine: row.cuisine,
    storageType: row.storage_type,
    dietType: row.diet_type,
    childFriendly: row.child_friendly,
    weeknightFavourite: row.weeknight_favourite,
    preparationType: row.preparation_type,
    instructions: row.instructions,
    imageStoragePath: row.image_storage_path,
    imageOriginalName: row.image_original_name,
    imageMimeType: row.image_mime_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    name: row.name,
    quantity: row.quantity,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Row shape for meal_plan_entries (SPEC.md section 9.3).
export type MealPlanEntryRow = {
  id: string;
  meal_date: string;
  slot: 1 | 2;
  entry_type: "recipe" | "manual";
  recipe_id: string | null;
  manual_title: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanEntry = {
  id: string;
  mealDate: string;
  slot: 1 | 2;
  entryType: "recipe" | "manual";
  recipeId: string | null;
  manualTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toMealPlanEntry(row: MealPlanEntryRow): MealPlanEntry {
  return {
    id: row.id,
    mealDate: row.meal_date,
    slot: row.slot,
    entryType: row.entry_type,
    recipeId: row.recipe_id,
    manualTitle: row.manual_title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// A meal-plan entry joined with the current title of its referenced recipe
// (null for manual entries). Calendar displays always show the recipe's
// current title (SPEC.md section 16.2), so this join happens on every read
// rather than trusting a denormalised copy.
export type MealPlanEntryWithRecipe = MealPlanEntry & { recipeTitle: string | null };

// Payload shapes accepted by the transactional RPC functions defined in
// supabase/migrations/20260827161528_recipe_write_functions.sql.
export type RecipeWritePayload = {
  title: string;
  summaryDescription: string | null;
  sourceUrl: string | null;
  prepTimeCategory: PrepTimeCategory | null;
  cuisine: Cuisine | null;
  storageType: StorageType | null;
  dietType: DietType | null;
  childFriendly: TernaryCategory | null;
  weeknightFavourite: TernaryCategory | null;
  preparationType: PreparationType | null;
  instructions: string | null;
};

export type IngredientWritePayload = {
  name: string;
  quantity: string | null;
};

// Typed Database shape passed to createClient() so `.from()` and `.rpc()`
// calls are checked against the real schema. Insert/Update types are kept
// permissive (Partial) since Stage 2 only ever writes through the RPC
// functions below or simple deletes; no direct table inserts/updates are
// performed from application code.
export type Database = {
  public: {
    Tables: {
      recipes: {
        Row: RecipeRow;
        Insert: Partial<RecipeRow>;
        Update: Partial<RecipeRow>;
        Relationships: [];
      };
      ingredients: {
        Row: IngredientRow;
        Insert: Partial<IngredientRow>;
        Update: Partial<IngredientRow>;
        Relationships: [];
      };
      meal_plan_entries: {
        Row: MealPlanEntryRow;
        Insert: Partial<MealPlanEntryRow>;
        Update: Partial<MealPlanEntryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_recipe_with_ingredients: {
        Args: { recipe: RecipeWritePayload; ingredients: IngredientWritePayload[] };
        Returns: string;
      };
      update_recipe_with_ingredients: {
        Args: {
          target_recipe_id: string;
          recipe: RecipeWritePayload;
          ingredients: IngredientWritePayload[];
        };
        Returns: undefined;
      };
    };
  };
};
