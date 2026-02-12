"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
require("https://deno.land/x/xhr@0.1.0/mod.ts");
var server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
var supabase_js_2_1 = require("https://esm.sh/@supabase/supabase-js@2");
var openAIApiKey = Deno.env.get('OPENAI_API_KEY');
var supabaseUrl = Deno.env.get('SUPABASE_URL');
var supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var requestBody, ingredients, calories, protein, carbs, fats, _a, mode, servings, isEasyMode, parseServings, servingsCount, parsedCalories, authHeader, supabase, _b, user, userError, userCountry, userCurrency, profileData, profileError, userPlan, _c, subscription, subError, planError_1, getModelForPlan, selectedModel, ingredientsWithNutrition, existingMealTitles, usedProteins_1, _d, generatedMeals, genError, _e, savedMeals, savedError, mealsError_1, availableProteins, preferredProtein, uniqueUsedProteins_1, unusedProteins, macroTargetsText, servingsInstruction, targetGoalsSection, macroToleranceSection, duplicatesSection, availableIngredientsSection, returnFormat, allowedIngredientNames, allowedIngredientNamesDisplay, ingredientStrictSection, userMessageSections, userMessage, systemContent, response, errorText, data, aiResponse, parseAmountToGrams_1, calculateMacrosFromIngredients, parsePriceValue, isAllowedIngredientName, filterIngredientsToAllowed, recipe, filteredIngredients, restaurantPrice, homemadePrice, priceCurrency, servingsValue, convertedRecipe, calculatedMacros, hasValidCalculation, finalMacros, calDiff, proteinDiff, carbsDiff, fatsDiff, warningMessage, convertedRecipe, realisticPortions, fallbackCalories, expiresAt, mealTags, mealData, _f, insertedMeal, mealError, error_1, errorMessage, errorDetails;
    var _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response(null, { headers: corsHeaders })];
                }
                _j.label = 1;
            case 1:
                _j.trys.push([1, 18, , 19]);
                return [4 /*yield*/, req.json()];
            case 2:
                requestBody = _j.sent();
                ingredients = requestBody.ingredients, calories = requestBody.calories, protein = requestBody.protein, carbs = requestBody.carbs, fats = requestBody.fats, _a = requestBody.mode, mode = _a === void 0 ? 'nutri' : _a, servings = requestBody.servings;
                isEasyMode = true;
                parseServings = function (value) {
                    if (typeof value === 'number' && !isNaN(value))
                        return Math.max(1, Math.min(10, Math.round(value)));
                    if (typeof value === 'string') {
                        var parsed = parseInt(value, 10);
                        if (!isNaN(parsed))
                            return Math.max(1, Math.min(10, parsed));
                    }
                    return 2;
                };
                servingsCount = parseServings(servings);
                parsedCalories = null;
                // Validate required fields
                if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Ingredients array is required and cannot be empty' }), {
                            status: 400,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        })];
                }
                authHeader = req.headers.get('Authorization');
                if (!authHeader) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        })];
                }
                supabase = (0, supabase_js_2_1.createClient)(supabaseUrl, supabaseServiceKey, {
                    global: { headers: { Authorization: authHeader } },
                });
                return [4 /*yield*/, supabase.auth.getUser()];
            case 3:
                _b = _j.sent(), user = _b.data.user, userError = _b.error;
                if (userError || !user) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        })];
                }
                userCountry = 'United States';
                userCurrency = 'USD';
                _j.label = 4;
            case 4:
                _j.trys.push([4, 6, , 7]);
                return [4 /*yield*/, supabase
                        .from('profiles')
                        .select('country, currency')
                        .eq('user_id', user.id)
                        .maybeSingle()];
            case 5:
                profileData = _j.sent();
                if (!profileData.error && profileData.data) {
                    userCountry = profileData.data.country || userCountry;
                    userCurrency = profileData.data.currency || userCurrency;
                }
                return [3 /*break*/, 7];
            case 6:
                profileError = _j.sent();
                console.error('Error fetching profile, defaulting country/currency:', profileError);
                return [3 /*break*/, 7];
            case 7:
                userPlan = 'free';
                _j.label = 8;
            case 8:
                _j.trys.push([8, 10, , 11]);
                return [4 /*yield*/, supabase
                        .from('user_subscriptions')
                        .select('plan')
                        .eq('user_id', user.id)
                        .maybeSingle()];
            case 9:
                _c = _j.sent(), subscription = _c.data, subError = _c.error;
                if (!subError && subscription) {
                    userPlan = subscription.plan || 'free';
                }
                return [3 /*break*/, 11];
            case 10:
                planError_1 = _j.sent();
                console.error('Error fetching subscription plan, defaulting to free:', planError_1);
                return [3 /*break*/, 11];
            case 11:
                getModelForPlan = function (plan) {
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
                selectedModel = getModelForPlan(userPlan);
                console.log("Using GPT model: ".concat(selectedModel, " for plan: ").concat(userPlan));
                ingredientsWithNutrition = ingredients.map(function (ingredient) {
                    // Handle both 'quantity' and 'available_quantity' from frontend
                    var quantity = ingredient.quantity || ingredient.available_quantity;
                    var quantityInGrams = parseFloat(quantity);
                    if (isNaN(quantityInGrams)) {
                        console.warn("Invalid quantity for ingredient ".concat(ingredient.name, ": ").concat(quantity));
                        quantityInGrams = 100; // Default fallback
                    }
                    // Unit conversion logic
                    if (ingredient.unit === 'pieces') {
                        // Piece-to-gram conversions for common ingredients
                        var pieceConversions = {
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
                        var conversion = pieceConversions[ingredient.name.toLowerCase()] || 100;
                        quantityInGrams *= conversion;
                    }
                    else if (ingredient.unit === 'kg')
                        quantityInGrams *= 1000;
                    else if (ingredient.unit === 'ml')
                        quantityInGrams *= 1; // liquids approx
                    else if (ingredient.unit === 'liters')
                        quantityInGrams *= 1000;
                    else if (ingredient.unit === 'tbsp')
                        quantityInGrams *= 15;
                    else if (ingredient.unit === 'tsp')
                        quantityInGrams *= 5;
                    else if (ingredient.unit === 'cups')
                        quantityInGrams *= 240;
                    else if (ingredient.unit === 'ounces')
                        quantityInGrams *= 28.35;
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
                existingMealTitles = [];
                usedProteins_1 = [];
                _j.label = 8;
            case 8:
                _j.trys.push([8, 11, , 12]);
                return [4 /*yield*/, supabase
                        .from('generated_meals')
                        .select('title, ingredients')
                        .eq('user_id', user.id)];
            case 9:
                _d = _j.sent(), generatedMeals = _d.data, genError = _d.error;
                return [4 /*yield*/, supabase
                        .from('saved_meals')
                        .select('title, ingredients')
                        .eq('user_id', user.id)];
            case 10:
                _e = _j.sent(), savedMeals = _e.data, savedError = _e.error;
                if (!genError && generatedMeals) {
                    existingMealTitles.push.apply(existingMealTitles, generatedMeals.map(function (m) { return m.title; }));
                    // Extract proteins from existing meals
                    generatedMeals.forEach(function (meal) {
                        if (meal.ingredients && Array.isArray(meal.ingredients)) {
                            meal.ingredients.forEach(function (ing) {
                                var ingName = (ing.name || '').toLowerCase();
                                if (ingName.includes('chicken') || ingName.includes('beef') || ingName.includes('pork') ||
                                    ingName.includes('fish') || ingName.includes('turkey') || ingName.includes('lamb')) {
                                    usedProteins_1.push(ingName);
                                }
                            });
                        }
                    });
                }
                if (!savedError && savedMeals) {
                    existingMealTitles.push.apply(existingMealTitles, savedMeals.map(function (m) { return m.title; }));
                    // Extract proteins from saved meals
                    savedMeals.forEach(function (meal) {
                        if (meal.ingredients && Array.isArray(meal.ingredients)) {
                            meal.ingredients.forEach(function (ing) {
                                var ingName = (ing.name || '').toLowerCase();
                                if (ingName.includes('chicken') || ingName.includes('beef') || ingName.includes('pork') ||
                                    ingName.includes('fish') || ingName.includes('turkey') || ingName.includes('lamb')) {
                                    usedProteins_1.push(ingName);
                                }
                            });
                        }
                    });
                }
                console.log("Found ".concat(existingMealTitles.length, " existing meals for user"));
                console.log("Proteins used in existing meals: ".concat(__spreadArray([], new Set(usedProteins_1), true).join(', ')));
                return [3 /*break*/, 12];
            case 11:
                mealsError_1 = _j.sent();
                console.error('Error fetching existing meals, continuing without duplicate check:', mealsError_1);
                return [3 /*break*/, 12];
            case 12:
                availableProteins = ingredientsWithNutrition
                    .filter(function (ing) {
                    var name = ing.name.toLowerCase();
                    return name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
                        name.includes('fish') || name.includes('turkey') || name.includes('lamb') ||
                        name.includes('ground beef') || name.includes('chicken breast');
                })
                    .map(function (ing) { return ing.name; });
                preferredProtein = '';
                if (availableProteins.length > 1) {
                    uniqueUsedProteins_1 = __spreadArray([], new Set(usedProteins_1), true);
                    unusedProteins = availableProteins.filter(function (p) {
                        return !uniqueUsedProteins_1.some(function (used) { return p.toLowerCase().includes(used); });
                    });
                    preferredProtein = unusedProteins.length > 0
                        ? unusedProteins[0]
                        : availableProteins[Math.floor(Math.random() * availableProteins.length)];
                }
                else if (availableProteins.length === 1) {
                    preferredProtein = availableProteins[0];
                }
                macroTargetsText = !isEasyMode ? "\nIf macronutrient targets exist, try to hit them as closely as possible:\n".concat(protein ? "- Protein: ".concat(protein, "g") : "", "\n").concat(carbs ? "- Carbs: ".concat(carbs, "g") : "", "\n").concat(fats ? "- Fats: ".concat(fats, "g") : "") : '';
                servingsInstruction = "Create a meal using ONLY the user's ingredients and divide the recipe appropriately for ".concat(servingsCount, " servings. Ensure the ingredient quantities and instructions reflect the number of portions.").concat(isEasyMode ? ' Do not calculate calories or macros. Focus only on correct ingredient scaling and realistic per-person portions.' : '');
                targetGoalsSection = isEasyMode
                    ? "SERVING FOCUS:\n- ".concat(servingsInstruction, "\n- Mention the servings count in the response so the user knows the portioning.\n- Use simple, beginner-friendly cooking language.")
                    : "TARGET GOALS:\n- Calories: ".concat(parsedCalories, " (\u00B130 kcal tolerance)\n").concat(protein ? "- Protein: ".concat(protein, "g (\u00B15g tolerance)") : "", "\n").concat(carbs ? "- Carbs: ".concat(carbs, "g (\u00B15g tolerance)") : "", "\n").concat(fats ? "- Fats: ".concat(fats, "g (\u00B15g tolerance)") : "", "\n").concat(macroTargetsText, "\n- ").concat(servingsInstruction);
                macroToleranceSection = isEasyMode ? '' : "MACRO TOLERANCE CHECKING:\n- If you can hit targets within tolerance: message = \"\u2705 Meal generated within target macros.\"\n- If you cannot hit targets: message = \"\u26A0\uFE0F No exact match found \u2014 generated closest possible meal.\"";
                duplicatesSection = "CRITICAL - AVOID DUPLICATES (THIS IS MANDATORY):\n".concat(existingMealTitles.length > 0 ? "The user ALREADY HAS these meals - you MUST NOT create anything similar:\n".concat(existingMealTitles.map(function (title, idx) { return "".concat(idx + 1, ". \"").concat(title, "\""); }).join('\n'), "\n\nSTRICT RULES:\n- DO NOT use the same meal name or any variation of it\n- DO NOT use similar cooking methods (e.g., if \"Chicken and Rice Stir Fry\" exists, don't create \"Chicken and Rice Bowl\" or \"Chicken Rice Stir Fry\")\n- DO NOT use similar flavor profiles (e.g., if \"Chicken and Rice with Creamy Carrot Sauce\" exists, don't create \"Chicken and Rice with Carrot Sauce\" or any creamy variation)\n- CREATE A COMPLETELY DIFFERENT MEAL TYPE: Use different cooking methods (baked, grilled, stewed, curry, casserole, skewers, wraps, etc.)\n- USE DIFFERENT FLAVOR PROFILES: Try different cuisines (Italian, Mexican, Asian, Mediterranean, etc.) or different spice combinations\n- BE CREATIVE: Think of unique combinations that haven't been used yet") : 'No existing meals found - you can create any meal.', "\n\nThe new meal MUST be completely unique - different name, different cooking method, different flavor profile, and different concept from ALL existing meals listed above.");
                availableIngredientsSection = "Available ingredients with nutritional data per 100g:\n".concat(JSON.stringify(ingredientsWithNutrition, null, 2));
                returnFormat = isEasyMode
                    ? "Return JSON in this exact format:\n{\n  \"mealName\": \"Realistic Meal Name\",\n  \"servings\": ".concat(servingsCount, ",\n  \"ingredients\": [\n    {\"name\": \"Chicken breast\", \"amount\": \"150g\"},\n    {\"name\": \"Rice\", \"amount\": \"100g\"},\n    {\"name\": \"Salt\", \"amount\": \"to taste (optional)\"},\n    {\"name\": \"Pepper\", \"amount\": \"to taste (optional)\"}\n  ],\n  \"preparationMethod\": \"1. First step here.\\n2. Second step here.\\n3. Third step here.\",\n  \"message\": \"A short, encouraging serving tip for the user.\",\n  \"restaurantPrice\": 45.00,\n  \"homemadePrice\": 14.50,\n  \"currency\": \"".concat(userCurrency, "\"\n}")
                    : "Return JSON in this exact format:\n{\n  \"mealName\": \"Realistic Meal Name\",\n  \"ingredients\": [\n    {\"name\": \"Chicken breast\", \"amount\": \"150g\"},\n    {\"name\": \"Rice\", \"amount\": \"100g\"},\n    {\"name\": \"Olive oil\", \"amount\": \"1 tsp (optional)\"},\n    {\"name\": \"Salt\", \"amount\": \"to taste (optional)\"}\n  ],\n  \"preparationMethod\": \"1. First step here.\\n2. Second step here.\\n3. Third step here.\\n4. Continue with numbered steps.\",\n  \"macros\": {\n    \"calories\": 520,\n    \"protein\": 42,\n    \"carbs\": 58,\n    \"fats\": 12\n  },\n  \"message\": \"\u2705 Meal generated within target macros.\" or \"\u26A0\uFE0F No exact match found \u2014 generated closest possible meal.\",\n  \"restaurantPrice\": 45.00,\n  \"homemadePrice\": 14.50,\n  \"currency\": \"".concat(userCurrency, "\"\n}");
                allowedIngredientNames = ingredientsWithNutrition
                    .map(function (ing) { return ((ing === null || ing === void 0 ? void 0 : ing.name) || '').toString().trim().toLowerCase(); })
                    .filter(Boolean);
                allowedIngredientNamesDisplay = ingredientsWithNutrition
                    .map(function (ing) { return ((ing === null || ing === void 0 ? void 0 : ing.name) || '').toString().trim(); })
                    .filter(Boolean);
                ingredientStrictSection = isEasyMode
                    ? "STRICT INGREDIENT RULES (EASY MODE):\n- You may ONLY use ingredients from the \"Available ingredients\" list below (this list already includes any pantry staples the user selected)\n- Do NOT add extra vegetables, grains, sauces, oils, or spices that are NOT listed\n- If the user only provides 1-2 ingredients, you must create a simple dish using ONLY those ingredients\n- The ONLY exceptions are salt and pepper (optional)\n\nALLOWED INGREDIENT NAMES:\n".concat(allowedIngredientNamesDisplay.map(function (name) { return "- ".concat(name); }).join('\n'))
                    : '';
                userMessageSections = [
                    isEasyMode
                        ? "You are a simple, beginner-friendly meal generator. Your goal is to create realistic, everyday portions that feel normal for the requested number of servings."
                        : "You are a smart meal generator that creates realistic, balanced meals. Your goal is to generate meals that are both nutritious and practical.",
                    isEasyMode
                        ? "SMART INGREDIENT USAGE RULES (EASY MODE):\n- Use REALISTIC, NORMAL portions per person (avoid oversized servings)\n- For protein: typically 100-160g per person\n- For carbs (rice, pasta, etc.): typically 50-80g DRY per person\n- For vegetables: 80-150g per person\n- For fats: 5-15g per person\n- Total amounts must scale with the number of servings (e.g., 2 servings \u2248 double the per-person amounts)\n- NEVER use more than available quantity, but use sensible portions\n- If an ingredient amount seems too large for the servings, reduce it"
                        : "SMART INGREDIENT USAGE RULES:\n- Use REALISTIC portions, not all available ingredients\n- For protein: typically 100-180g per meal\n- For carbs (rice, pasta, etc.): typically 60-120g per meal  \n- For vegetables: 50-150g per meal\n- For fats: 5-20g per meal\n- NEVER use more than available quantity, but use sensible portions",
                    "PROTEIN SELECTION (CRITICAL):\n".concat(availableProteins.length > 1 ? "You have MULTIPLE proteins available: ".concat(availableProteins.join(', '), "\n").concat(preferredProtein ? "PREFERRED PROTEIN FOR THIS MEAL: Use \"".concat(preferredProtein, "\" as the main protein.\n").concat(usedProteins_1.length > 0 ? "Proteins already used in recent meals: ".concat(__spreadArray([], new Set(usedProteins_1), true).join(', ')) : '', "\n- You MUST vary which protein you use across different meal generations\n- If you've been using chicken, switch to beef (or vice versa)\n- Create variety by rotating through ALL available proteins") : 'Rotate through all available proteins - use different ones in different meals.') : availableProteins.length === 1 ? "You have one protein available: ".concat(availableProteins[0], ". Use it in this meal.") : 'No specific proteins detected - use appropriate protein sources from available ingredients.'),
                    targetGoalsSection,
                    "PRICING ESTIMATES (REQUIRED):\n- Country: ".concat(userCountry, "\n- Currency: ").concat(userCurrency, "\n- Servings: ").concat(servingsCount, " (prices MUST be for the total number of servings)\n- Estimate a MID-RANGE restaurant price for THIS MEAL SIZE (not cheap, not expensive)\n- Estimate the total homemade ingredient cost for THIS MEAL SIZE\n- Base pricing primarily on servings count (portion-based), not on ingredient quantity details\n- For example: if servings=2, estimate a typical 2-portion meal price in ").concat(userCountry, "\n- Use realistic LOCAL pricing for ").concat(userCountry, " (do NOT use foreign pricing or currency conversions)\n- Return numeric values only (no currency symbols) and ensure restaurantPrice > homemadePrice"),
                    "OPTIONAL CONDIMENTS:\nYou can add these as optional ingredients:\n- Salt (optional)\n- Pepper (optional)",
                    "MEAL REALISM:\n- Create balanced, tasty meals (not just ingredient dumps)\n- Choose logical meal formats (stir fry, bowl, salad, pasta, etc.)\n- Ensure good flavor combinations\n- Make it something someone would actually want to eat",
                    macroToleranceSection,
                    duplicatesSection,
                    ingredientStrictSection,
                    availableIngredientsSection,
                    returnFormat
                ].filter(Boolean);
                userMessage = userMessageSections.join('\n\n');
                // Call OpenAI API
                console.log('Calling OpenAI API...');
                systemContent = isEasyMode
                    ? 'You are a friendly meal generator that focuses on simple, approachable recipes. Always return valid JSON in the exact format specified. When Easy Mode is active, you never calculate calories or macros and you emphasize correct portioning for the requested number of servings.'
                    : 'You are a smart meal generator that creates realistic, balanced meals. Always return valid JSON in the exact format specified. Focus on creating meals that are both nutritious and practical, using realistic portions and good flavor combinations. CRITICAL: You must create UNIQUE meals that are completely different from any existing meals the user already has. Never repeat meal names or create similar variations.';
                return [4 /*yield*/, fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': "Bearer ".concat(openAIApiKey),
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
                    })];
            case 13:
                response = _j.sent();
                if (!!response.ok) return [3 /*break*/, 15];
                return [4 /*yield*/, response.text()];
            case 14:
                errorText = _j.sent();
                console.error('OpenAI API error:', response.status, errorText);
                throw new Error("OpenAI API error (".concat(response.status, "): ").concat(errorText));
            case 15: return [4 /*yield*/, response.json()];
            case 16:
                data = _j.sent();
                aiResponse = (_h = (_g = data.choices[0]) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.content;
                if (!aiResponse) {
                    throw new Error('No response content from OpenAI');
                }
                parseAmountToGrams_1 = function (amountStr, ingredientName, nutritionData) {
                    if (!amountStr || typeof amountStr !== 'string') {
                        console.warn("Invalid amount string for ".concat(ingredientName, ": ").concat(amountStr));
                        return 0;
                    }
                    var amount = amountStr.toLowerCase().trim();
                    // Remove "(optional)" text
                    var cleanAmount = amount.replace(/\s*\(optional\)/g, '').trim();
                    // Check if it's in grams already (most common case)
                    if (cleanAmount.endsWith('g')) {
                        var grams = parseFloat(cleanAmount.replace(/g$/, '').trim());
                        if (!isNaN(grams) && grams > 0) {
                            return grams;
                        }
                    }
                    // Check for teaspoons/tsp (e.g., "1 tsp", "2 tsp")
                    if (cleanAmount.includes('tsp')) {
                        var tspMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*tsp/);
                        if (tspMatch) {
                            var tsp = parseFloat(tspMatch[1]);
                            if (!isNaN(tsp) && tsp > 0) {
                                return tsp * 5; // 1 tsp = 5g (approximate for most liquids/oils)
                            }
                        }
                    }
                    // Check for tablespoons/tbsp
                    if (cleanAmount.includes('tbsp')) {
                        var tbspMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*tbsp/);
                        if (tbspMatch) {
                            var tbsp = parseFloat(tbspMatch[1]);
                            if (!isNaN(tbsp) && tbsp > 0) {
                                return tbsp * 15; // 1 tbsp = 15g
                            }
                        }
                    }
                    // Check for cups
                    if (cleanAmount.includes('cup')) {
                        var cupMatch = cleanAmount.match(/(\d+(?:\.\d+)?)\s*cup/);
                        if (cupMatch) {
                            var cup = parseFloat(cupMatch[1]);
                            if (!isNaN(cup) && cup > 0) {
                                return cup * 240; // 1 cup = 240g (approximate)
                            }
                        }
                    }
                    // Try to extract number - might be in grams without "g" suffix or pieces
                    var numMatch = cleanAmount.match(/(\d+(?:\.\d+)?)/);
                    if (numMatch) {
                        var num = parseFloat(numMatch[1]);
                        if (!isNaN(num) && num > 0) {
                            // Check if it's a piece-based ingredient
                            var pieceConversions = {
                                'onion': 100, 'egg': 50, 'apple': 150, 'banana': 120,
                                'tomato': 100, 'potato': 150, 'carrot': 75, 'lemon': 60,
                                'orange': 150, 'avocado': 200
                            };
                            var ingLower = ingredientName.toLowerCase();
                            for (var _i = 0, _a = Object.entries(pieceConversions); _i < _a.length; _i++) {
                                var _b = _a[_i], key = _b[0], value = _b[1];
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
                calculateMacrosFromIngredients = function (recipeIngredients, availableIngredients) {
                    var _a;
                    var totalCalories = 0;
                    var totalProtein = 0;
                    var totalCarbs = 0;
                    var totalFats = 0;
                    var _loop_1 = function (recipeIng) {
                        // Skip optional condiments that don't significantly affect macros
                        var condimentKeywords = ['salt', 'pepper', 'herbs', 'spices', 'lemon juice', 'vinegar'];
                        var ingNameLower = recipeIng.name.toLowerCase();
                        var isCondiment = condimentKeywords.some(function (keyword) { return ingNameLower.includes(keyword); });
                        if (isCondiment && (((_a = recipeIng.amount) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('optional')) || ingNameLower.includes('optional'))) {
                            return "continue";
                        }
                        // Find matching ingredient in available ingredients
                        // Try exact match first, then partial matches
                        var availableIng = availableIngredients.find(function (ai) {
                            var aiNameLower = ai.name.toLowerCase();
                            var ingNameLower = recipeIng.name.toLowerCase();
                            // Exact match
                            if (aiNameLower === ingNameLower)
                                return true;
                            // Check if one contains the other (handles "Rice (white, cooked)" vs "Rice")
                            var aiWords = aiNameLower.split(/[\s(,)]+/).filter(function (w) { return w.length > 2; });
                            var ingWords = ingNameLower.split(/[\s(,)]+/).filter(function (w) { return w.length > 2; });
                            // Check if key words match (e.g., "chicken" and "breast" should match "chicken breast")
                            var hasKeyMatch = aiWords.some(function (aiWord) {
                                return ingWords.some(function (ingWord) {
                                    return aiWord === ingWord ||
                                        (aiWord.includes(ingWord) && ingWord.length > 3) ||
                                        (ingWord.includes(aiWord) && aiWord.length > 3);
                                });
                            });
                            return hasKeyMatch ||
                                aiNameLower.includes(ingNameLower) ||
                                ingNameLower.includes(aiNameLower);
                        });
                        if (availableIng) {
                            var amountStr = recipeIng.amount || recipeIng.weight || "0g";
                            var gramsUsed = parseAmountToGrams_1(amountStr, recipeIng.name, availableIng);
                            if (gramsUsed > 0) {
                                // Calculate nutrition based on per 100g values - NO ROUNDING during calculation
                                var multiplier = gramsUsed / 100;
                                var ingCal = (availableIng.calories_per_100g || 0) * multiplier;
                                var ingProtein = (availableIng.protein_per_100g || 0) * multiplier;
                                var ingCarbs = (availableIng.carbs_per_100g || 0) * multiplier;
                                var ingFats = (availableIng.fat_per_100g || 0) * multiplier;
                                totalCalories += ingCal;
                                totalProtein += ingProtein;
                                totalCarbs += ingCarbs;
                                totalFats += ingFats;
                            }
                        }
                    };
                    for (var _i = 0, recipeIngredients_1 = recipeIngredients; _i < recipeIngredients_1.length; _i++) {
                        var recipeIng = recipeIngredients_1[_i];
                        _loop_1(recipeIng);
                    }
                    return {
                        calories: Math.round(totalCalories),
                        protein: Math.round(totalProtein),
                        carbs: Math.round(totalCarbs),
                        fats: Math.round(totalFats)
                    };
                };
                isAllowedIngredientName = function (name) {
                    if (!name)
                        return false;
                    var normalized = name.toLowerCase().trim();
                    if (normalized.includes('salt') || normalized.includes('pepper'))
                        return true;
                    return allowedIngredientNames.some(function (allowed) {
                        return normalized === allowed ||
                            normalized.includes(allowed) ||
                            allowed.includes(normalized);
                    });
                };
                filterIngredientsToAllowed = function (items) {
                    if (!Array.isArray(items))
                        return [];
                    return items
                        .map(function (item) {
                        if (typeof item === 'string') {
                            return { name: item, amount: 'to taste' };
                        }
                        return item;
                    })
                        .filter(function (item) { return isAllowedIngredientName(item === null || item === void 0 ? void 0 : item.name); });
                };
                recipe = void 0;
                try {
                    recipe = JSON.parse(aiResponse);
                    if (isEasyMode) {
                        if (!recipe.mealName || !recipe.ingredients || !recipe.preparationMethod) {
                            throw new Error('Missing required recipe fields for easy mode');
                        }
                        filteredIngredients = filterIngredientsToAllowed(recipe.ingredients);
                parsePriceValue = function (value) {
                    if (typeof value === 'number' && isFinite(value))
                        return Number(value.toFixed(2));
                    if (typeof value === 'string') {
                        var normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
                        var parsed = parseFloat(normalized);
                        return isNaN(parsed) ? null : Number(parsed.toFixed(2));
                    }
                    return null;
                };
                        if (filteredIngredients.length === 0) {
                            throw new Error('No valid ingredients remained after filtering to allowed ingredients');
                        }
                        recipe.ingredients = filteredIngredients;
                        restaurantPrice = parsePriceValue(recipe.restaurantPrice || recipe.restaurant_price);
                        homemadePrice = parsePriceValue(recipe.homemadePrice || recipe.homemade_price || recipe.homePrice);
                        priceCurrency = typeof recipe.currency === 'string' && recipe.currency.trim()
                            ? recipe.currency.trim().toUpperCase()
                            : userCurrency;
                        servingsValue = recipe.servings && !isNaN(parseInt(recipe.servings, 10))
                            ? Math.max(1, Math.min(10, parseInt(recipe.servings, 10)))
                            : servingsCount;
                        convertedRecipe = {
                            title: recipe.mealName,
                            ingredients: recipe.ingredients,
                            preparation_method: recipe.preparationMethod,
                            total_calories: null,
                            total_protein: null,
                            total_carbs: null,
                            total_fats: null,
                            cooking_time: 30,
                            description: recipe.message
                                ? "".concat(recipe.message, " (Serves ").concat(servingsValue, ")")
                                : "Serves ".concat(servingsValue, " \u2022 Easy Mode recipe"),
                            calorie_warning: null,
                            macro_warning: null,
                            servings: servingsValue,
                            restaurant_price: restaurantPrice,
                            homemade_price: homemadePrice,
                            price_currency: priceCurrency
                        };
                        recipe = convertedRecipe;
                    }
                    else {
                        // Validate required fields for nutri mode format
                        if (!recipe.mealName || !recipe.ingredients || !recipe.preparationMethod || !recipe.macros) {
                            throw new Error('Missing required recipe fields in nutri mode format');
                        }
                        calculatedMacros = calculateMacrosFromIngredients(recipe.ingredients, ingredientsWithNutrition);
                        hasValidCalculation = calculatedMacros.calories > 0 ||
                            calculatedMacros.protein > 0 ||
                            calculatedMacros.carbs > 0 ||
                            calculatedMacros.fats > 0;
                        finalMacros = hasValidCalculation ? calculatedMacros : {
                            calories: recipe.macros.calories || 0,
                            protein: recipe.macros.protein || 0,
                            carbs: recipe.macros.carbs || 0,
                            fats: recipe.macros.fats || 0
                        };
                        calDiff = Math.abs(finalMacros.calories - recipe.macros.calories);
                        proteinDiff = Math.abs(finalMacros.protein - recipe.macros.protein);
                        carbsDiff = Math.abs(finalMacros.carbs - recipe.macros.carbs);
                        fatsDiff = Math.abs(finalMacros.fats - recipe.macros.fats);
                        warningMessage = recipe.message || "";
                        if (calDiff > 50 || proteinDiff > 10 || carbsDiff > 10 || fatsDiff > 5) {
                            if (!warningMessage.includes('⚠️')) {
                                warningMessage = "⚠️ Macros calculated from actual ingredients may differ from estimates.";
                            }
                        }
                        restaurantPrice = parsePriceValue(recipe.restaurantPrice || recipe.restaurant_price);
                        homemadePrice = parsePriceValue(recipe.homemadePrice || recipe.homemade_price || recipe.homePrice);
                        priceCurrency = typeof recipe.currency === 'string' && recipe.currency.trim()
                            ? recipe.currency.trim().toUpperCase()
                            : userCurrency;
                        convertedRecipe = {
                            title: recipe.mealName,
                            ingredients: recipe.ingredients,
                            preparation_method: recipe.preparationMethod,
                            total_calories: finalMacros.calories,
                            total_protein: finalMacros.protein,
                            total_carbs: finalMacros.carbs,
                            total_fats: finalMacros.fats,
                            cooking_time: 30,
                            description: warningMessage || recipe.message || "Smart AI generated recipe",
                            calorie_warning: (warningMessage === null || warningMessage === void 0 ? void 0 : warningMessage.includes('⚠️')) ? warningMessage : null,
                            macro_warning: (warningMessage === null || warningMessage === void 0 ? void 0 : warningMessage.includes('⚠️')) ? warningMessage : null,
                            servings: servingsCount,
                            restaurant_price: restaurantPrice,
                            homemade_price: homemadePrice,
                            price_currency: priceCurrency
                        };
                        recipe = convertedRecipe;
                    }
                }
                catch (parseError) {
                    console.error('Error parsing OpenAI response:', parseError);
                    console.error('Raw AI response:', aiResponse);
                    realisticPortions = ingredientsWithNutrition.map(function (ing) {
                        var portion = Math.min(ing.available_quantity, 100); // Default max 100g
                        // Smart portioning based on ingredient type
                        if (ing.name.toLowerCase().includes('chicken') || ing.name.toLowerCase().includes('beef') || ing.name.toLowerCase().includes('fish')) {
                            portion = Math.min(ing.available_quantity, 150); // Protein: up to 150g
                        }
                        else if (ing.name.toLowerCase().includes('rice') || ing.name.toLowerCase().includes('pasta') || ing.name.toLowerCase().includes('bread')) {
                            portion = Math.min(ing.available_quantity, 120); // Carbs: up to 120g
                        }
                        else if (ing.name.toLowerCase().includes('oil') || ing.name.toLowerCase().includes('butter')) {
                            portion = Math.min(ing.available_quantity, 20); // Fats: up to 20g
                        }
                        return {
                            name: ing.name,
                            amount: "".concat(portion, "g")
                        };
                    });
                    if (isEasyMode) {
                        recipe = {
                            title: "Simple Family Meal",
                            ingredients: realisticPortions,
                            preparation_method: "1. Prepare all ingredients.\n2. Cook proteins, add vegetables, then finish with carbs.\n3. Divide evenly into servings and season to taste.",
                            total_calories: null,
                            total_protein: null,
                            total_carbs: null,
                            total_fats: null,
                            cooking_time: 30,
                            description: "Easy Mode fallback recipe \u2022 Serves ".concat(servingsCount),
                            calorie_warning: null,
                            macro_warning: null,
                            servings: servingsCount,
                            restaurant_price: null,
                            homemade_price: null,
                            price_currency: userCurrency
                        };
                    }
                    else {
                        fallbackCalories = Math.min(parsedCalories || 500, 600);
                        recipe = {
                            title: "Quick Balanced Meal",
                            ingredients: realisticPortions,
                            preparation_method: "1. Prepare all ingredients as needed.\n2. Cook protein source first, then add vegetables.\n3. Season with salt, pepper, and herbs.\n4. Serve hot and enjoy!",
                            total_calories: fallbackCalories,
                            // Round to integers for database compatibility
                            total_protein: Math.round(fallbackCalories * 0.25 / 4), // 25% protein
                            total_carbs: Math.round(fallbackCalories * 0.45 / 4), // 45% carbs
                            total_fats: Math.round(fallbackCalories * 0.30 / 9), // 30% fats
                            cooking_time: 30,
                            description: "Fallback recipe with realistic portions",
                            calorie_warning: "⚠️ No exact match found — generated closest possible meal.",
                            macro_warning: "⚠️ No exact match found — generated closest possible meal.",
                            servings: servingsCount,
                            restaurant_price: null,
                            homemade_price: null,
                            price_currency: userCurrency
                        };
                    }
                }
                // Save to Supabase
                // User is already authenticated and retrieved above, reuse it
                if (!user) {
                    console.error('User not found');
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'User not found' }), {
                            status: 401,
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' })
                        })];
                }
                console.log('Saving meal to database for user:', user.id);
                expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);
                mealTags = ['ai-generated'];
                if (isEasyMode) {
                    mealTags.push('easy-mode', "Serves ".concat(recipe.servings || servingsCount));
                }
                mealData = {
                    user_id: user.id,
                    title: recipe.title,
                    ingredients: recipe.ingredients,
                    preparation_method: recipe.preparation_method,
                    calories: typeof recipe.total_calories === 'number' ? recipe.total_calories : (parsedCalories !== null && parsedCalories !== void 0 ? parsedCalories : null),
                    cooking_time: recipe.cooking_time || 30,
                    description: recipe.description || "AI generated recipe",
                    // Round to integers since database columns are INTEGER type
                    protein: typeof recipe.total_protein === 'number' ? Math.round(recipe.total_protein) : null,
                    carbs: typeof recipe.total_carbs === 'number' ? Math.round(recipe.total_carbs) : null,
                    fats: typeof recipe.total_fats === 'number' ? Math.round(recipe.total_fats) : null,
                    restaurant_price: typeof recipe.restaurant_price === 'number' ? recipe.restaurant_price : null,
                    homemade_price: typeof recipe.homemade_price === 'number' ? recipe.homemade_price : null,
                    price_currency: recipe.price_currency || userCurrency,
                    tags: mealTags,
                    calorie_warning: recipe.calorie_warning || null,
                    macro_warning: recipe.macro_warning || null,
                    expires_at: expiresAt.toISOString()
                };
                return [4 /*yield*/, supabase
                        .from('generated_meals')
                        .insert(mealData)
                        .select()
                        .single()];
            case 17:
                _f = _j.sent(), insertedMeal = _f.data, mealError = _f.error;
                if (mealError) {
                    console.error('Database insertion error:', mealError);
                    throw new Error('Failed to save meal: ' + mealError.message);
                }
                console.log('Meal saved successfully:', insertedMeal === null || insertedMeal === void 0 ? void 0 : insertedMeal.id);
                return [2 /*return*/, new Response(JSON.stringify({
                        success: true,
                        meal: insertedMeal,
                        message: 'Meal generated successfully'
                    }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    })];
            case 18:
                error_1 = _j.sent();
                console.error('=== ERROR IN GENERATE MEAL FUNCTION ===');
                console.error('Error:', error_1);
                console.error('Error type:', error_1 instanceof Error ? error_1.constructor.name : typeof error_1);
                console.error('Error message:', error_1 instanceof Error ? error_1.message : String(error_1));
                if (error_1 instanceof Error && error_1.stack) {
                    console.error('Stack trace:', error_1.stack);
                }
                errorMessage = error_1 instanceof Error ? error_1.message : String(error_1) || 'Unknown error occurred';
                errorDetails = {
                    error: errorMessage,
                    timestamp: new Date().toISOString(),
                    type: error_1 instanceof Error ? error_1.constructor.name : typeof error_1,
                    stack: error_1 instanceof Error ? error_1.stack : undefined
                };
                console.error('Returning error response:', JSON.stringify(errorDetails, null, 2));
                return [2 /*return*/, new Response(JSON.stringify(errorDetails), {
                        status: 500,
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    })];
            case 19: return [2 /*return*/];
        }
    });
}); });
