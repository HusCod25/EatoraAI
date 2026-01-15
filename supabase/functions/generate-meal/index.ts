import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { ingredients, calories, protein, carbs, fats, mode = 'nutri', servings } = requestBody;
    const isEasyMode = mode === 'easy';
    const parseServings = (value: unknown): number => {
      if (typeof value === 'number' && !isNaN(value)) return Math.max(1, Math.min(10, Math.round(value)));
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) return Math.max(1, Math.min(10, parsed));
      }
      return 2;
    };
    const servingsCount = parseServings(servings);
    const parsedCalories = !isEasyMode && calories ? parseInt(calories, 10) : null;

    // Validate required fields
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(JSON.stringify({ error: 'Ingredients array is required and cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isEasyMode && (parsedCalories === null || isNaN(parsedCalories))) {
      return new Response(JSON.stringify({ error: 'Valid calories value is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's subscription plan to determine GPT model
    let userPlan = 'free'; // Default to free
    try {
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!subError && subscription) {
        userPlan = subscription.plan || 'free';
      }
    } catch (planError) {
      console.error('Error fetching subscription plan, defaulting to free:', planError);
      // Continue with free plan if error
    }

    // Select GPT model based on subscription plan
    const getModelForPlan = (plan: string): string => {
      switch (plan) {
        case 'free':
        case 'beginner':
          return 'gpt-4o-mini';
        case 'chef':
        case 'unlimited':
        case 'admin':
          return 'gpt-4o';
        default:
          return 'gpt-4o-mini'; // Default to mini for safety
      }
    };

    const selectedModel = getModelForPlan(userPlan);
    console.log(`Using GPT model: ${selectedModel} for plan: ${userPlan}`);

    // Process ingredients with nutrition data - handle both frontend formats
    const ingredientsWithNutrition = ingredients.map((ingredient) => {
      // Handle both 'quantity' and 'available_quantity' from frontend
      const quantity = ingredient.quantity || ingredient.available_quantity;
      let quantityInGrams = parseFloat(quantity);
      
      if (isNaN(quantityInGrams)) {
        console.warn(`Invalid quantity for ingredient ${ingredient.name}: ${quantity}`);
        quantityInGrams = 100; // Default fallback
      }
      
      // Unit conversion logic
      if (ingredient.unit === 'pieces') {
        // Piece-to-gram conversions for common ingredients
        const pieceConversions: { [key: string]: number } = {
          'onion': 100,
          'egg': 50,
          'apple': 150,
          'banana': 120,
          'tomato': 100,
          'potato': 150,
          'carrot': 75,
          'lemon': 60,
          'orange': 150,
          'avocado': 200
        };
        
        const conversion = pieceConversions[ingredient.name.toLowerCase()] || 100;
        quantityInGrams *= conversion;
      } else if (ingredient.unit === 'kg') quantityInGrams *= 1000;
      else if (ingredient.unit === 'ml') quantityInGrams *= 1; // liquids approx
      else if (ingredient.unit === 'liters') quantityInGrams *= 1000;
      else if (ingredient.unit === 'tbsp') quantityInGrams *= 15;
      else if (ingredient.unit === 'tsp') quantityInGrams *= 5;
      else if (ingredient.unit === 'cups') quantityInGrams *= 240;
      else if (ingredient.unit === 'ounces') quantityInGrams *= 28.35;

      return {
        name: ingredient.name,
        available_quantity: Math.round(quantityInGrams),
        unit: "grams",
        calories_per_100g: ingredient.calories_per_100g || 0,
        protein_per_100g: ingredient.protein_per_100g || 0,
        carbs_per_100g: ingredient.carbs_per_100g || 0,
        fat_per_100g: ingredient.fat_per_100g || 0
      };
    });

    // Fetch existing meals (both generated and saved) to avoid duplicates
    let existingMealTitles: string[] = [];
    let usedProteins: string[] = []; // Track which proteins have been used
    try {
      // Fetch generated meals (temporary, expire after 24h)
      const { data: generatedMeals, error: genError } = await supabase
        .from('generated_meals')
        .select('title, ingredients')
        .eq('user_id', user.id);

      // Fetch saved meals (permanent)
      const { data: savedMeals, error: savedError } = await supabase
        .from('saved_meals')
        .select('title, ingredients')
        .eq('user_id', user.id);

      if (!genError && generatedMeals) {
        existingMealTitles.push(...generatedMeals.map(m => m.title));
        // Extract proteins from existing meals
        generatedMeals.forEach(meal => {
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach((ing: any) => {
              const ingName = (ing.name || '').toLowerCase();
              if (ingName.includes('chicken') || ingName.includes('beef') || ingName.includes('pork') || 
                  ingName.includes('fish') || ingName.includes('turkey') || ingName.includes('lamb')) {
                usedProteins.push(ingName);
              }
            });
          }
        });
      }
      if (!savedError && savedMeals) {
        existingMealTitles.push(...savedMeals.map(m => m.title));
        // Extract proteins from saved meals
        savedMeals.forEach(meal => {
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach((ing: any) => {
              const ingName = (ing.name || '').toLowerCase();
              if (ingName.includes('chicken') || ingName.includes('beef') || ingName.includes('pork') || 
                  ingName.includes('fish') || ingName.includes('turkey') || ingName.includes('lamb')) {
                usedProteins.push(ingName);
              }
            });
          }
        });
      }

      console.log(`Found ${existingMealTitles.length} existing meals for user`);
      console.log(`Proteins used in existing meals: ${[...new Set(usedProteins)].join(', ')}`);
    } catch (mealsError) {
      console.error('Error fetching existing meals, continuing without duplicate check:', mealsError);
      // Continue even if we can't fetch existing meals
    }

    // Identify available proteins from ingredients
    const availableProteins = ingredientsWithNutrition
      .filter(ing => {
        const name = ing.name.toLowerCase();
        return name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
               name.includes('fish') || name.includes('turkey') || name.includes('lamb') ||
               name.includes('ground beef') || name.includes('chicken breast');
      })
      .map(ing => ing.name);

    // Determine which protein to prioritize (use one that hasn't been used recently)
    let preferredProtein = '';
    if (availableProteins.length > 1) {
      const uniqueUsedProteins = [...new Set(usedProteins)];
      // Find a protein that hasn't been used, or use the least recently used one
      const unusedProteins = availableProteins.filter(p => 
        !uniqueUsedProteins.some(used => p.toLowerCase().includes(used))
      );
      preferredProtein = unusedProteins.length > 0 
        ? unusedProteins[0] 
        : availableProteins[Math.floor(Math.random() * availableProteins.length)];
    } else if (availableProteins.length === 1) {
      preferredProtein = availableProteins[0];
    }

    const macroTargetsLines = !isEasyMode
      ? [
          "If macronutrient targets exist, try to hit them as closely as possible:",
          protein ? `- Protein: ${protein}g` : null,
          carbs ? `- Carbs: ${carbs}g` : null,
          fats ? `- Fats: ${fats}g` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : '';

    const servingsInstruction = `Create a meal using ONLY the user's ingredients and divide the recipe appropriately for ${servingsCount} servings. Ensure the ingredient quantities and instructions reflect the number of portions.${isEasyMode ? ' Do not calculate calories or macros. Focus only on correct ingredient scaling.' : ''}`;

    const targetGoalsSection = isEasyMode
      ? [
          'SERVING FOCUS:',
          `- ${servingsInstruction}`,
          '- Mention the servings count in the response so the user knows the portioning.',
          '- Use simple, beginner-friendly cooking language.'
        ].join('\n')
      : [
          'TARGET GOALS:',
          `- Calories: ${parsedCalories} (±30 kcal tolerance)`,
          protein ? `- Protein: ${protein}g (±5g tolerance)` : null,
          carbs ? `- Carbs: ${carbs}g (±5g tolerance)` : null,
          fats ? `- Fats: ${fats}g (±5g tolerance)` : null,
          macroTargetsLines || null,
          `- ${servingsInstruction}`
        ].filter(Boolean).join('\n');

    const macroToleranceSection = isEasyMode
      ? ''
      : `MACRO TOLERANCE CHECKING:
- If you can hit targets within tolerance: message = "✅ Meal generated within target macros."
- If you cannot hit targets: message = "⚠️ No exact match found — generated closest possible meal."`;

    const existingMealsList = existingMealTitles
      .map((title, idx) => `${idx + 1}. "${title}"`)
      .join('\n');

    const duplicatesSection = existingMealTitles.length > 0
      ? [
          'CRITICAL - AVOID DUPLICATES (THIS IS MANDATORY):',
          'The user ALREADY HAS these meals - you MUST NOT create anything similar:',
          existingMealsList,
          '',
          'STRICT RULES:',
          '- DO NOT use the same meal name or any variation of it',
          '- DO NOT use similar cooking methods (e.g., if "Chicken and Rice Stir Fry" exists, don\'t create "Chicken and Rice Bowl" or "Chicken Rice Stir Fry")',
          '- DO NOT use similar flavor profiles (e.g., if "Chicken and Rice with Creamy Carrot Sauce" exists, don\'t create "Chicken and Rice with Carrot Sauce" or any creamy variation)',
          '- CREATE A COMPLETELY DIFFERENT MEAL TYPE: Use different cooking methods (baked, grilled, stewed, curry, casserole, skewers, wraps, etc.)',
          '- USE DIFFERENT FLAVOR PROFILES: Try different cuisines (Italian, Mexican, Asian, Mediterranean, etc.) or different spice combinations',
          '- BE CREATIVE: Think of unique combinations that haven\'t been used yet',
          '',
          'The new meal MUST be completely unique - different name, different cooking method, different flavor profile, and different concept from ALL existing meals listed above.'
        ].join('\n')
      : [
          'CRITICAL - AVOID DUPLICATES (THIS IS MANDATORY):',
          'No existing meals found - you can create any meal.'
        ].join('\n');

    const availableIngredientsSection = 'Available ingredients with nutritional data per 100g:\n' +
      JSON.stringify(ingredientsWithNutrition, null, 2);

    const returnFormat = isEasyMode
      ? [
          'Return JSON in this exact format (DO NOT include placeholder text, replace with actual instructions):',
          '{',
          '  "mealName": "Realistic Meal Name",',
          `  "servings": ${servingsCount},`,
          '  "ingredients": [',
          '    {"name": "Chicken breast", "amount": "150g"},',
          '    {"name": "Rice", "amount": "100g"},',
          '    {"name": "Olive oil", "amount": "1 tsp (optional)"},',
          '    {"name": "Salt", "amount": "to taste (optional)"}',
          '  ],',
          '  "preparationMethod": "1. PREP WORK: Rinse 100g of rice under cold running water in a strainer until the water runs clear. This removes excess starch and prevents clumping.\\n\\n2. HEAT THE PAN: Heat 1 tsp of olive oil in a large pan over medium heat (setting 5-6 out of 10). Wait until the oil shimmers slightly, about 30-45 seconds.\\n\\n3. COOK PROTEIN: Place the 150g chicken breast in the pan. You should hear a gentle sizzle. Cook for 6-7 minutes without moving it. The chicken is ready to flip when the edges turn white (about 1cm up the sides) and the bottom is golden brown.\\n\\n[Continue with more detailed cooking steps]\\n\\n**SERVE:**\\n\\n21. PLATING: Arrange the fluffy rice on a plate as a base.\\n\\n22. ADD PROTEIN: Place the cooked chicken on top of or alongside the rice.\\n\\n23. FINISHING TOUCHES: Optionally, drizzle with a little extra lemon juice or olive oil for added flavor.\\n\\n24. PRESENTATION: Garnish with fresh herbs if available for a restaurant-quality look.\\n\\n25. ENJOY: Take a moment to admire your creation before digging in. You have made a delicious, balanced meal all by yourself!",',
          '  "message": "A short, encouraging message for the user."',
          '}'
        ].join('\n')
      : [
          'Return JSON in this exact format (DO NOT include placeholder text, replace with actual instructions):',
          '{',
          '  "mealName": "Realistic Meal Name",',
          '  "ingredients": [',
          '    {"name": "Chicken breast", "amount": "150g"},',
          '    {"name": "Rice", "amount": "100g"},',
          '    {"name": "Olive oil", "amount": "1 tsp (optional)"},',
          '    {"name": "Salt", "amount": "to taste (optional)"}',
          '  ],',
          '  "preparationMethod": "1. PREP WORK: Rinse 100g of rice under cold running water in a strainer until the water runs clear. This removes excess starch.\\n\\n2. HEAT THE PAN: Heat 1 tsp olive oil in a large pan over medium heat (setting 5-6 out of 10). Wait 30-45 seconds until the oil shimmers.\\n\\n3. COOK PROTEIN: Place the 150g chicken breast in the pan and cook for 6-7 minutes without moving it. You should hear a gentle sizzle. The chicken is ready to flip when the edges turn white and the bottom is golden brown.\\n\\n4. FLIP AND CONTINUE: Flip the chicken and cook for another 6-7 minutes until internal temperature reaches 75°C/165°F. The meat should be white throughout with no pink.\\n\\n[Continue with detailed cooking steps]\\n\\n**SERVE:**\\n\\n18. PLATING: Arrange the fluffy rice on a plate as a base.\\n\\n19. ADD PROTEIN: Place the cooked chicken on top of or alongside the rice.\\n\\n20. FINISHING TOUCHES: Drizzle with extra olive oil or lemon juice for added flavor.\\n\\n21. PRESENTATION: Garnish with fresh herbs if available.\\n\\n22. ENJOY: Take a moment to admire your creation before digging in!",',
          '  "macros": {',
          '    "calories": 520,',
          '    "protein": 42,',
          '    "carbs": 58,',
          '    "fats": 12',
          '  },',
          '  "message": "✅ Meal generated within target macros." or "⚠️ No exact match found — generated closest possible meal."',
          '}'
        ].join('\n');

    const userMessageSections = [
      `You are a smart meal generator that creates realistic, balanced meals. Your goal is to generate meals that are both nutritious and practical.`,
      `SMART INGREDIENT USAGE RULES:
- Use REALISTIC portions, not all available ingredients
- For protein: typically 100-180g per meal
- For carbs (rice, pasta, etc.): typically 60-120g per meal  
- For vegetables: 50-150g per meal
- For fats: 5-20g per meal
- NEVER use more than available quantity, but use sensible portions`,
      `COOKING INSTRUCTIONS - CRITICAL FOR BEGINNERS:
Your preparation method MUST be extremely detailed and beginner-friendly. Assume the person has NEVER cooked before.

STRUCTURE YOUR INSTRUCTIONS IN TWO SECTIONS:

**SECTION 1: COOKING STEPS** (numbered 1-X)
For EVERY cooking step, include:
1. EXACT MEASUREMENTS: "100g rice", "1 tsp oil", "150g chicken"
2. EXACT TEMPERATURES: "Medium heat (setting 5-6 out of 10)", "Internal temperature 75°C/165°F"
3. EXACT TIMING: "Cook for 6-7 minutes", "Rest for 2-3 minutes", "Simmer for 15-20 minutes"
4. VISUAL CUES: "Until golden brown", "When edges turn white", "Until water runs clear", "When the surface looks dry"
5. AUDIO CUES: "You should hear a gentle sizzle", "When the water starts to boil (rapid bubbles)"
6. TEXTURE CUES: "Until tender when pierced with a fork", "When the meat is no longer pink inside"
7. WHY IT MATTERS: "This removes excess starch", "This ensures food safety", "This keeps it juicy"
8. WHAT TO LOOK FOR: "The bottom should be golden and crispy", "Juices should run clear"

**SECTION 2: SERVING & PLATING** (marked with **SERVE:** then numbered starting fresh)
After all cooking steps are complete, add a section marked "**SERVE:**" followed by 3-5 steps about:
- How to plate the meal attractively
- Where to place each component
- Optional garnishes or finishing touches
- Presentation tips
- A final encouraging message

Example structure:
"1. PREP: [detailed instruction]
2. COOK: [detailed instruction]
...
15. FINAL COOK STEP: [detailed instruction]

**SERVE:**

16. PLATING: Arrange the rice on a plate as a base.
17. ADD PROTEIN: Place the chicken on top or alongside the rice.
18. GARNISH: Drizzle with olive oil or lemon juice for extra flavor.
19. PRESENTATION: Add fresh herbs if available for color.
20. ENJOY: Admire your creation - you've made a delicious meal!"

Example of GOOD detailed step:
"Place the 150g chicken breast in the pan and cook for 6-7 minutes without moving it. You should hear a gentle sizzle. The chicken is ready to flip when the edges turn white (about 1cm up the sides) and the bottom is golden brown. Use a spatula to gently lift the edge and check - it should release easily from the pan when ready."

Example of BAD step (too vague):
"Cook the chicken until done."

BREAK DOWN COMPLEX TASKS:
- Instead of "prepare the vegetables", say: "Rinse the carrots under cold water. Pat dry with a paper towel. Use a vegetable peeler to remove the skin. Cut into 0.5cm thick rounds."
- Instead of "cook the rice", give full rice cooking instructions with water ratios, timing, and doneness checks.`,
      `PROTEIN SELECTION (CRITICAL):
${availableProteins.length > 1 ? `You have MULTIPLE proteins available: ${availableProteins.join(', ')}
${preferredProtein ? `PREFERRED PROTEIN FOR THIS MEAL: Use "${preferredProtein}" as the main protein.
${usedProteins.length > 0 ? `Proteins already used in recent meals: ${[...new Set(usedProteins)].join(', ')}` : ''}
- You MUST vary which protein you use across different meal generations
- If you've been using chicken, switch to beef (or vice versa)
- Create variety by rotating through ALL available proteins` : 'Rotate through all available proteins - use different ones in different meals.'}` : availableProteins.length === 1 ? `You have one protein available: ${availableProteins[0]}. Use it in this meal.` : 'No specific proteins detected - use appropriate protein sources from available ingredients.'}`,
      targetGoalsSection,
      `OPTIONAL CONDIMENTS:
You can add these as optional ingredients (they don't significantly affect calories):
- Salt, pepper, herbs, spices
- Olive oil (1-2 tsp)
- Lemon juice, vinegar
- Basic seasonings`,
      `MEAL REALISM:
- Create balanced, tasty meals (not just ingredient dumps)
- Choose logical meal formats (stir fry, bowl, salad, pasta, etc.)
- Ensure good flavor combinations
- Make it something someone would actually want to eat`,
      macroToleranceSection,
      duplicatesSection,
      availableIngredientsSection,
      returnFormat
    ].filter(Boolean);

    const userMessage = userMessageSections.join('\n\n');
    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const systemContent = isEasyMode
      ? 'You are a friendly meal generator that focuses on simple, approachable recipes for beginners. Always return valid JSON in the exact format specified. When Easy Mode is active, you never calculate calories or macros and you emphasize correct portioning for the requested number of servings. CRITICAL: Your cooking instructions must be EXTREMELY detailed with exact temperatures, times, visual cues, and step-by-step guidance that even someone who has never cooked before can follow successfully.'
      : 'You are a smart meal generator that creates realistic, balanced meals with HIGHLY DETAILED cooking instructions. Always return valid JSON in the exact format specified. Focus on creating meals that are both nutritious and practical, using realistic portions and good flavor combinations. CRITICAL: You must create UNIQUE meals that are completely different from any existing meals the user already has. Never repeat meal names or create similar variations. CRITICAL: Your cooking instructions must include exact temperatures, specific timing, visual/audio cues, and detailed explanations that make cooking foolproof for complete beginners.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.7, // Increased temperature for more creativity and variety
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response content from OpenAI');
    }

    // Helper function to parse amount string (e.g., "150g", "1 tsp") to grams
    const parseAmountToGrams = (amountStr: string, ingredientName: string, nutritionData: any): number => {
      if (!amountStr || typeof amountStr !== 'string') {
        console.warn(`Invalid amount string for ${ingredientName}: ${amountStr}`);
        return 0;
      }
      
      const amount = amountStr.toLowerCase().trim();
      
      // Remove "(optional)" text
      const cleanAmount = amount.replace(/\s*\(optional\)/g, '').trim();
      
      // Check if it's in grams already (most common case)
      if (cleanAmount.endsWith('g')) {
        const grams = parseFloat(cleanAmount.replace(/g$/, '').trim());
        if (!isNaN(grams) && grams > 0) {
          return grams;
        }
      }
      
      // Check for teaspoons/tsp (e.g., "1 tsp", "2 tsp")
      if (cleanAmount.includes('tsp')) {
        const tspMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*tsp/);
        if (tspMatch) {
          const tsp = parseFloat(tspMatch[1]);
          if (!isNaN(tsp) && tsp > 0) {
            return tsp * 5; // 1 tsp = 5g (approximate for most liquids/oils)
          }
        }
      }
      
      // Check for tablespoons/tbsp
      if (cleanAmount.includes('tbsp')) {
        const tbspMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*tbsp/);
        if (tbspMatch) {
          const tbsp = parseFloat(tbspMatch[1]);
          if (!isNaN(tbsp) && tbsp > 0) {
            return tbsp * 15; // 1 tbsp = 15g
          }
        }
      }
      
      // Check for cups
      if (cleanAmount.includes('cup')) {
        const cupMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*cup/);
        if (cupMatch) {
          const cup = parseFloat(cupMatch[1]);
          if (!isNaN(cup) && cup > 0) {
            return cup * 240; // 1 cup = 240g (approximate)
          }
        }
      }
      
      // Try to extract number - might be in grams without "g" suffix or pieces
      const numMatch = cleanAmount.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        const num = parseFloat(numMatch[1]);
        if (!isNaN(num) && num > 0) {
          // Check if it's a piece-based ingredient
          const pieceConversions: { [key: string]: number } = {
            'onion': 100, 'egg': 50, 'apple': 150, 'banana': 120,
            'tomato': 100, 'potato': 150, 'carrot': 75, 'lemon': 60,
            'orange': 150, 'avocado': 200
          };
          const ingLower = ingredientName.toLowerCase();
          for (const [key, value] of Object.entries(pieceConversions)) {
            if (ingLower.includes(key)) {
              return num * value;
            }
          }
          
          // If no piece conversion found, assume it's already in grams
          // (Some formats might just say "150" meaning 150g)
          return num;
        }
      }
      
      return 0;
    };

    // Helper function to calculate macros from actual ingredients
    const calculateMacrosFromIngredients = (recipeIngredients: any[], availableIngredients: any[]): {calories: number, protein: number, carbs: number, fats: number} => {
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;
      
      for (const recipeIng of recipeIngredients) {
        const ingNameLower = recipeIng.name.toLowerCase();
        
        // Find matching ingredient in available ingredients
        // Try exact match first, then partial matches
        let availableIng = availableIngredients.find(ai => {
          const aiNameLower = ai.name.toLowerCase();
          const ingNameLower = recipeIng.name.toLowerCase();
          
          // Exact match
          if (aiNameLower === ingNameLower) return true;
          
          // Check if one contains the other (handles "Rice (white, cooked)" vs "Rice")
          const aiWords = aiNameLower.split(/[\s(,)]+/).filter(w => w.length > 2);
          const ingWords = ingNameLower.split(/[\s(,)]+/).filter(w => w.length > 2);
          
          // Check if key words match (e.g., "chicken" and "breast" should match "chicken breast")
          const hasKeyMatch = aiWords.some(aiWord => 
            ingWords.some(ingWord => 
              aiWord === ingWord || 
              (aiWord.includes(ingWord) && ingWord.length > 3) ||
              (ingWord.includes(aiWord) && aiWord.length > 3)
            )
          );
          
          return hasKeyMatch || 
                 aiNameLower.includes(ingNameLower) || 
                 ingNameLower.includes(aiNameLower);
        });
        
        if (availableIng) {
          const amountStr = recipeIng.amount || recipeIng.weight || "0g";
          const gramsUsed = parseAmountToGrams(amountStr, recipeIng.name, availableIng);
          
          if (gramsUsed > 0) {
            // Calculate nutrition based on per 100g values - NO ROUNDING during calculation
            const multiplier = gramsUsed / 100;
            
            const ingCal = (availableIng.calories_per_100g || 0) * multiplier;
            const ingProtein = (availableIng.protein_per_100g || 0) * multiplier;
            const ingCarbs = (availableIng.carbs_per_100g || 0) * multiplier;
            const ingFats = (availableIng.fat_per_100g || 0) * multiplier;
            
            totalCalories += ingCal;
            totalProtein += ingProtein;
            totalCarbs += ingCarbs;
            totalFats += ingFats;
          }
        }
      }
      
      return {
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fats: Math.round(totalFats)
      };
    };

    let recipe;
    try {
      recipe = JSON.parse(aiResponse);
      
      if (isEasyMode) {
        if (!recipe.mealName || !recipe.ingredients || !recipe.preparationMethod) {
          throw new Error('Missing required recipe fields for easy mode');
        }

        const servingsValue = recipe.servings && !isNaN(parseInt(recipe.servings, 10))
          ? Math.max(1, Math.min(10, parseInt(recipe.servings, 10)))
          : servingsCount;

        const easyModeMacros = calculateMacrosFromIngredients(recipe.ingredients, ingredientsWithNutrition);

        const convertedRecipe = {
          title: recipe.mealName,
          ingredients: recipe.ingredients,
          preparation_method: recipe.preparationMethod,
          total_calories: easyModeMacros.calories,
          total_protein: easyModeMacros.protein,
          total_carbs: easyModeMacros.carbs,
          total_fats: easyModeMacros.fats,
          cooking_time: 30,
          description: recipe.message 
            ? `${recipe.message} (Serves ${servingsValue})`
            : `Serves ${servingsValue} • Easy Mode recipe`,
          calorie_warning: null,
          macro_warning: null,
          servings: servingsValue
        };

        recipe = convertedRecipe;
      } else {
        // Validate required fields for nutri mode format
      if (!recipe.mealName || !recipe.ingredients || !recipe.preparationMethod || !recipe.macros) {
          throw new Error('Missing required recipe fields in nutri mode format');
      }
      
      // Calculate actual macros from ingredients
      const calculatedMacros = calculateMacrosFromIngredients(recipe.ingredients, ingredientsWithNutrition);
      
      // Use calculated macros - they should always be more accurate
      // Only fall back to AI if calculation resulted in all zeros (which shouldn't happen)
      const hasValidCalculation = calculatedMacros.calories > 0 || 
                                   calculatedMacros.protein > 0 || 
                                   calculatedMacros.carbs > 0 || 
                                   calculatedMacros.fats > 0;
      
      const finalMacros = hasValidCalculation ? calculatedMacros : {
        calories: recipe.macros.calories || 0,
        protein: recipe.macros.protein || 0,
        carbs: recipe.macros.carbs || 0,
        fats: recipe.macros.fats || 0
      };
      
      // Check if calculated macros differ significantly from AI estimates
      const calDiff = Math.abs(finalMacros.calories - recipe.macros.calories);
      const proteinDiff = Math.abs(finalMacros.protein - recipe.macros.protein);
      const carbsDiff = Math.abs(finalMacros.carbs - recipe.macros.carbs);
      const fatsDiff = Math.abs(finalMacros.fats - recipe.macros.fats);
      
      let warningMessage = recipe.message || "";
      if (calDiff > 50 || proteinDiff > 10 || carbsDiff > 10 || fatsDiff > 5) {
        if (!warningMessage.includes('⚠️')) {
          warningMessage = "⚠️ Macros calculated from actual ingredients may differ from estimates.";
        }
      }
      
      // Convert new format to database format
      const convertedRecipe = {
        title: recipe.mealName,
        ingredients: recipe.ingredients,
        preparation_method: recipe.preparationMethod,
        total_calories: finalMacros.calories,
        total_protein: finalMacros.protein,
        total_carbs: finalMacros.carbs,
        total_fats: finalMacros.fats,
        cooking_time: 30,
        description: warningMessage || recipe.message || "Smart AI generated recipe",
        calorie_warning: warningMessage?.includes('⚠️') ? warningMessage : null,
          macro_warning: warningMessage?.includes('⚠️') ? warningMessage : null,
          servings: servingsCount
      };
      
      recipe = convertedRecipe;
      }
      
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // Enhanced fallback recipe with realistic portions
      const realisticPortions = ingredientsWithNutrition.map((ing: any) => {
        let portion = Math.min(ing.available_quantity, 100); // Default max 100g
        
        // Smart portioning based on ingredient type
        if (ing.name.toLowerCase().includes('chicken') || ing.name.toLowerCase().includes('beef') || ing.name.toLowerCase().includes('fish')) {
          portion = Math.min(ing.available_quantity, 150); // Protein: up to 150g
        } else if (ing.name.toLowerCase().includes('rice') || ing.name.toLowerCase().includes('pasta') || ing.name.toLowerCase().includes('bread')) {
          portion = Math.min(ing.available_quantity, 120); // Carbs: up to 120g
        } else if (ing.name.toLowerCase().includes('oil') || ing.name.toLowerCase().includes('butter')) {
          portion = Math.min(ing.available_quantity, 20); // Fats: up to 20g
        }
        
        return {
          name: ing.name,
          amount: `${portion}g`
        };
      });
      
      if (isEasyMode) {
        const easyFallbackMacros = calculateMacrosFromIngredients(realisticPortions, ingredientsWithNutrition);
        recipe = {
          title: "Simple Family Meal",
          ingredients: realisticPortions,
          preparation_method: "1. PREP WORK: Gather all ingredients and place them on a clean counter. Wash your hands thoroughly with soap for 20 seconds. Pat all ingredients dry with paper towels.\n\n2. PROTEIN PREPARATION: If using meat, remove it from packaging and place on a cutting board. Pat completely dry with paper towels (this helps it brown properly). Season both sides with a pinch of salt and pepper.\n\n3. HEAT THE PAN: Place a large pan on the stove over medium heat (dial setting 5-6 out of 10). Add 1 tsp of oil and wait 30-45 seconds until it shimmers slightly. To test if it's ready, hold your hand 6 inches above the pan - you should feel warmth.\n\n4. COOK PROTEIN: Carefully place the protein in the pan. You should hear a gentle sizzling sound. Cook without moving for 6-7 minutes until the bottom is golden brown. Flip once and cook for another 6-7 minutes until fully cooked (internal temperature should reach 75°C/165°F for chicken).\n\n5. ADD VEGETABLES: Add your vegetables to the pan with the protein. Stir every 2-3 minutes until they're tender when pierced with a fork (usually 5-8 minutes).\n\n6. FINISH WITH CARBS: If using rice or pasta, cook separately according to package instructions. Add to the pan at the end, mix everything together, and taste. Add more salt and pepper if needed.\n\n7. REST AND SERVE: Remove from heat and let rest for 2 minutes. Divide evenly into portions and serve hot.",
          total_calories: easyFallbackMacros.calories,
          total_protein: easyFallbackMacros.protein,
          total_carbs: easyFallbackMacros.carbs,
          total_fats: easyFallbackMacros.fats,
          cooking_time: 30,
          description: `Easy Mode fallback recipe • Serves ${servingsCount}`,
          calorie_warning: null,
          macro_warning: null,
          servings: servingsCount
        };
      } else {
        const fallbackCalories = Math.min(parsedCalories || 500, 600);
      recipe = {
        title: "Quick Balanced Meal",
        ingredients: realisticPortions,
        preparation_method: "1. PREPARATION: Wash hands thoroughly for 20 seconds. Rinse all vegetables under cold running water and pat dry. Set up your cooking area with all ingredients within reach.\n\n2. HEAT CONTROL: Place a large skillet or pan on the stove. Turn to medium heat (setting 5-6 out of 10). Add 1 tsp of oil and wait 30-45 seconds until it shimmers.\n\n3. PROTEIN COOKING: Pat protein dry with paper towels. Season with salt and pepper on both sides. Place in hot pan - you should hear sizzling. Cook for 6-7 minutes without moving. The edges should turn opaque and the bottom golden. Flip and cook another 6-7 minutes until internal temperature reaches 75°C/165°F.\n\n4. VEGETABLE ADDITION: Add vegetables to the pan. Stir every 2-3 minutes using a wooden spoon or spatula. Cook until fork-tender (5-8 minutes).\n\n5. FINISHING TOUCHES: Season with salt, pepper, and any herbs you have. Taste and adjust. Remove from heat and let rest 2 minutes before serving.\n\n6. SERVE: Divide into portions and enjoy while hot!",
          total_calories: fallbackCalories,
        // Round to integers for database compatibility
          total_protein: Math.round(fallbackCalories * 0.25 / 4), // 25% protein
          total_carbs: Math.round(fallbackCalories * 0.45 / 4), // 45% carbs
          total_fats: Math.round(fallbackCalories * 0.30 / 9), // 30% fats
        cooking_time: 30,
        description: "Fallback recipe with realistic portions",
        calorie_warning: "⚠️ No exact match found — generated closest possible meal.",
          macro_warning: "⚠️ No exact match found — generated closest possible meal.",
          servings: servingsCount
      };
      }
    }

    // Save to Supabase
    // User is already authenticated and retrieved above, reuse it
    if (!user) {
      console.error('User not found');
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Saving meal to database for user:', user.id);

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const mealTags = ['ai-generated'];
    if (isEasyMode) {
      mealTags.push('easy-mode', `Serves ${recipe.servings || servingsCount}`);
    }

    const mealData = {
      user_id: user.id,
      title: recipe.title,
      ingredients: recipe.ingredients,
      preparation_method: recipe.preparation_method,
      calories: typeof recipe.total_calories === 'number' ? recipe.total_calories : (parsedCalories ?? null),
      cooking_time: recipe.cooking_time || 30,
      description: recipe.description || "AI generated recipe",
      // Round to integers since database columns are INTEGER type
      protein: typeof recipe.total_protein === 'number' ? Math.round(recipe.total_protein) : null,
      carbs: typeof recipe.total_carbs === 'number' ? Math.round(recipe.total_carbs) : null,
      fats: typeof recipe.total_fats === 'number' ? Math.round(recipe.total_fats) : null,
      tags: mealTags,
      calorie_warning: recipe.calorie_warning || null,
      macro_warning: recipe.macro_warning || null,
      expires_at: expiresAt.toISOString()
    };


    const { data: insertedMeal, error: mealError } = await supabase
      .from('generated_meals')
      .insert(mealData)
      .select()
      .single();

    if (mealError) {
      console.error('Database insertion error:', mealError);
      throw new Error('Failed to save meal: ' + mealError.message);
    }

    console.log('Meal saved successfully:', insertedMeal?.id);

    return new Response(JSON.stringify({ 
      success: true,
      meal: insertedMeal,
      message: 'Meal generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN GENERATE MEAL FUNCTION ===');
    console.error('Error:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error) || 'Unknown error occurred';
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    };
    
    console.error('Returning error response:', JSON.stringify(errorDetails, null, 2));
    
    return new Response(JSON.stringify(errorDetails), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

