import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface IngredientSubmission {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  unit: 'grams' | 'ml';
  category?: string;
  submitted_by: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
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

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    console.log('Ingredient submission received:', JSON.stringify(requestBody, null, 2));

    // Validate required fields
    const { name, calories, protein, carbs, fats, unit, category, submitted_by } = requestBody as IngredientSubmission;

    if (!name || !calories || !protein || !carbs || !fats || !unit || !submitted_by) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name, calories, protein, carbs, fats, unit, submitted_by' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate data types and ranges
    if (typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name must be a non-empty string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof calories !== 'number' || calories < 0 || calories > 10000) {
      return new Response(JSON.stringify({ error: 'Calories must be a number between 0 and 10000' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof protein !== 'number' || protein < 0 || protein > 100) {
      return new Response(JSON.stringify({ error: 'Protein must be a number between 0 and 100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof carbs !== 'number' || carbs < 0 || carbs > 100) {
      return new Response(JSON.stringify({ error: 'Carbs must be a number between 0 and 100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof fats !== 'number' || fats < 0 || fats > 100) {
      return new Response(JSON.stringify({ error: 'Fats must be a number between 0 and 100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['grams', 'ml'].includes(unit)) {
      return new Response(JSON.stringify({ error: 'Unit must be either "grams" or "ml"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the submitted_by matches the authenticated user
    if (submitted_by !== user.id) {
      return new Response(JSON.stringify({ error: 'User ID mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if ingredient already exists in main database
    const { data: existingIngredient, error: checkError } = await supabase
      .from('Ingredients')
      .select('name')
      .ilike('name', name.trim())
      .limit(1);

    if (checkError) {
      console.error('Error checking existing ingredient:', checkError);
      return new Response(JSON.stringify({ error: 'Database error while checking existing ingredients' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingIngredient && existingIngredient.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Ingredient "${name}" already exists in our database` 
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already submitted this ingredient recently
    const { data: recentSubmission, error: recentError } = await supabase
      .from('pending_ingredients')
      .select('id, created_at')
      .eq('submitted_by', user.id)
      .ilike('name', name.trim())
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(1);

    if (recentError) {
      console.error('Error checking recent submissions:', recentError);
    } else if (recentSubmission && recentSubmission.length > 0) {
      return new Response(JSON.stringify({ 
        error: `You already submitted "${name}" recently. Please wait 24 hours before submitting again.` 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
   

    // Validate macro consistency (optional warning, not blocking)
    const calculatedCalories = (protein * 4) + (carbs * 4) + (fats * 9);
    const difference = Math.abs(calculatedCalories - calories);
    
    if (difference > 100) {
      console.warn(`Large macro-calorie difference for ${name}: ${difference} kcal`);
    }

    // Insert into pending_ingredients table
    const ingredientData = {
      name: name.trim(),
      calories: parseFloat(calories.toFixed(2)),
      protein: parseFloat(protein.toFixed(2)),
      carbs: parseFloat(carbs.toFixed(2)),
      fats: parseFloat(fats.toFixed(2)),
      unit,
      category: category || 'Other',
      submitted_by: user.id,
      status: 'pending'
    };

    console.log('Inserting ingredient data:', JSON.stringify(ingredientData, null, 2));

    const { data: insertedIngredient, error: insertError } = await supabase
      .from('pending_ingredients')
      .insert(ingredientData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to submit ingredient: ' + insertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Ingredient submitted successfully:', insertedIngredient?.id);

    return new Response(JSON.stringify({ 
      success: true,
      ingredient: insertedIngredient,
      message: 'Ingredient submitted successfully for review'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in submit-ingredient function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    };
    
    return new Response(JSON.stringify(errorDetails), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
