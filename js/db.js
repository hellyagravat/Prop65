// ============================================
// PROP65 SHIELD - DATA LAYER
// ============================================

(function (global) {
  'use strict';

  function sb() {
    if (!global.supabaseClient) {
      throw new Error(
        'Supabase client not initialised. Check js/supabase-config.js'
      );
    }
    return global.supabaseClient;
  }

  // --------------------------------------------
  // PLAN CATALOG
  // --------------------------------------------

  var PLANS = {
    free: {
      id: 'free', name: 'Starter', price: 0, cadence: 'mo',
      tagline: 'For small shops getting compliant.',
      features: [
        'Up to 25 flagged products',
        'Product-page warning only',
        'Universal JS embed',
        'Manual warning edits'
      ]
    },
    premium: {
      id: 'premium', name: 'Growth', price: 29, cadence: 'mo',
      tagline: 'For sellers scaling across a catalog.',
      features: [
        'Unlimited products',
        'Product + cart placement',
        'Auto-updated when rules change',
        'Banner color customisation',
        'Activity log'
      ]
    },
    agency: {
      id: 'agency', name: 'Agency', price: 79, cadence: 'mo',
      tagline: 'For multi-brand operators.',
      features: [
        'Everything in Growth',
        'Multiple stores / domains',
        'Priority support + team seats',
        'Per-store embed keys'
      ]
    }
  };

  // --------------------------------------------
  // DODO PRODUCT IDs
  // --------------------------------------------

  var DODO_PRODUCTS = {
    premium: 'pdt_0No1HVvOYWPt06KaL3QNT',
    agency:  'pdt_0No1HJyNOQsvxSmOeU9WD'
  };

  // --------------------------------------------
  // AUTH
  // --------------------------------------------

  async function getUser() {
    var result = await sb().auth.getUser();
    if (result.error) throw result.error;
    return result.data.user;
  }

  // --------------------------------------------
  // PROFILES
  // --------------------------------------------

  async function getProfile() {
    var user = await getUser();
    if (!user) return null;

    var result = await sb()
      .from('profiles')
      .select('id, full_name, company_name, website, phone, ' +
              'membership_plan, notify_on_warning, notify_on_update, ' +
              'created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    if (result.data) return result.data;

    var created = await sb()
      .from('profiles')
      .insert({
        id: user.id,
        full_name: (user.email || '').split('@')[0],
        membership_plan: 'free'
      })
      .select()
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  async function updateProfile(patch) {
    var user = await getUser();
    if (!user) throw new Error('Not signed in');

    var allowed = {
      full_name: true,
      company_name: true,
      website: true,
      phone: true,
      notify_on_warning: true,
      notify_on_update: true
    };

    var safe = {};
    Object.keys(patch).forEach(function (key) {
      if (allowed[key]) safe[key] = patch[key];
    });

    if (!Object.keys(safe).length) {
      throw new Error('No editable fields in update.');
    }

    var result = await sb()
      .from('profiles')
      .update(safe)
      .eq('id', user.id)
      .select()
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  function getPlanInfo(planId) {
    return PLANS[planId] || PLANS.free;
  }

  function listPlans() {
    return [PLANS.free, PLANS.premium, PLANS.agency];
  }

  // --------------------------------------------
  // CATALOG
  // --------------------------------------------

  async function listCatalog(search) {
    var query = sb()
      .from('products')
      .select('id, name, description, category')
      .order('name', { ascending: true })
      .limit(300);

    if (search && search.trim()) {
      query = query.ilike('name', '%' + search.trim() + '%');
    }

    var result = await query;
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function listChemicals() {
    var result = await sb()
      .from('chemicals')
      .select('id, name, hazard, cas_number, synonyms, ' +
              'common_categories, has_safe_harbor, oehha_listed_at, note')
      .order('name', { ascending: true });

    if (result.error) throw result.error;
    return result.data || [];
  }

  // --------------------------------------------
  // MY PRODUCTS
  // --------------------------------------------

  async function listMyProducts() {
    var user = await getUser();
    if (!user) return [];

    var result = await sb()
      .from('user_products')
      .select(`
        id,
        created_at,
        product:products (
          id,
          name,
          description,
          category
        ),
        warnings!user_product_id (
          id,
          chemical_ids,
          chemical_names,
          warning_type,
          warning_text,
          source,
          confidence,
          reviewed_by_user,
          reviewed_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (result.error) {
      console.error('listMyProducts error:', result.error);
      throw result.error;
    }
    return result.data || [];
  }

  async function addProduct(productId) {
    var user = await getUser();
    if (!user) throw new Error('Not signed in');

    var result = await sb()
      .from('user_products')
      .insert({ user_id: user.id, product_id: productId })
      .select('id')
      .single();

    if (result.error) {
      if (result.error.code === '23505') {
        throw new Error('That product is already in your list.');
      }
      if (result.error.code === '42501') {
        throw new Error('Your current plan does not allow adding products.');
      }
      throw result.error;
    }

    return result.data;
  }

  async function removeProduct(userProductId) {
    var result = await sb()
      .from('user_products')
      .delete()
      .eq('id', userProductId);

    if (result.error) throw result.error;
  }

  // --------------------------------------------
  // WARNINGS
  // --------------------------------------------

  async function getWarningForProduct(userProductId) {
    var result = await sb()
      .from('warnings')
      .select('*')
      .eq('user_product_id', userProductId)
      .maybeSingle();

    if (result.error) throw result.error;
    return result.data;
  }

  async function upsertWarningForProduct(userProductId, chemicals, options) {
    options = options || {};

    if (!chemicals || !chemicals.length) {
      throw new Error('At least one chemical is required.');
    }

    var merged = global.Prop65WarningGen.generate(chemicals);

    var payload = {
      user_product_id:  userProductId,
      chemical_ids:     chemicals.map(function (c) { return c.id; }),
      chemical_names:   chemicals.map(function (c) { return c.name; }),
      warning_type:     merged.hazard,
      warning_text:     merged.short,
      source:           options.source || 'auto',
      confidence:       options.confidence != null ? options.confidence : 1.0,
      reviewed_by_user: options.reviewedByUser !== false,
      reviewed_at:      options.reviewedByUser !== false
                          ? new Date().toISOString()
                          : null,
      oehha_list_date:  options.oehlaListDate || null
    };

    var existing = await sb()
      .from('warnings')
      .select('id')
      .eq('user_product_id', userProductId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (existing.data) {
      var updated = await sb()
        .from('warnings')
        .update(payload)
        .eq('id', existing.data.id)
        .select()
        .single();
      if (updated.error) throw updated.error;
      return updated.data;
    }

    var inserted = await sb()
      .from('warnings')
      .insert(payload)
      .select()
      .single();
    if (inserted.error) throw inserted.error;
    return inserted.data;
  }

  async function deleteWarningForProduct(userProductId) {
    var result = await sb()
      .from('warnings')
      .delete()
      .eq('user_product_id', userProductId);
    if (result.error) throw result.error;
  }

  // --------------------------------------------
  // INGREDIENTS
  // --------------------------------------------

  async function listIngredients(userProductId) {
    var result = await sb()
      .from('product_ingredients')
      .select('*')
      .eq('user_product_id', userProductId)
      .order('created_at', { ascending: true });

    if (result.error) throw result.error;
    return result.data || [];
  }

  async function replaceIngredients(userProductId, ingredients) {
    var del = await sb()
      .from('product_ingredients')
      .delete()
      .eq('user_product_id', userProductId);
    if (del.error) throw del.error;

    if (!ingredients.length) return [];

    var rows = ingredients.map(function (ing) {
      return {
        user_product_id:      userProductId,
        raw_text:             ing.raw_text,
        material_class:       ing.material_class || null,
        match_method:         ing.match_method || null,
        match_confidence:     ing.match_confidence != null
                                ? ing.match_confidence : null,
        matched_chemical_ids: ing.matched_chemical_ids || []
      };
    });

    var result = await sb()
      .from('product_ingredients')
      .insert(rows)
      .select();

    if (result.error) throw result.error;
    return result.data;
  }

  // --------------------------------------------
  // STATS
  // --------------------------------------------

  async function getStats() {
    var user = await getUser();
    if (!user) return { products: 0, warnings: 0 };

    var productsResult = await sb()
      .from('user_products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (productsResult.error) throw productsResult.error;

    var warningsResult = await sb()
      .from('warnings')
      .select('id', { count: 'exact', head: true });

    if (warningsResult.error) throw warningsResult.error;

    return {
      products: productsResult.count || 0,
      warnings: warningsResult.count || 0
    };
  }

  // --------------------------------------------
  // PAYMENTS — DODO
  // --------------------------------------------

    async function startCheckout(planId) {
    var user = await getUser();
    if (!user) throw new Error('Not signed in');

    var productId = DODO_PRODUCTS[planId];
    if (!productId) throw new Error('Unknown plan: ' + planId);

    var result = await sb().functions.invoke('create-checkout', {
      body: {
        productId: productId,
        userId: user.id,
        userEmail: user.email,
        returnUrl: window.location.href.split('?')[0]  // ← new: remember this page
      }
    });

    if (result.error) {
      console.error('create-checkout failed:', result.error);
      throw new Error(result.error.message || 'Could not start checkout');
    }

    if (!result.data || !result.data.url) {
      throw new Error('No checkout URL returned');
    }

    return result.data.url;
  }

  // --------------------------------------------
  // EXPORT
  // --------------------------------------------

  global.Prop65DB = {
    getUser: getUser,
    getProfile: getProfile,
    updateProfile: updateProfile,
    getPlanInfo: getPlanInfo,
    listPlans: listPlans,
    listCatalog: listCatalog,
    listChemicals: listChemicals,
    listMyProducts: listMyProducts,
    addProduct: addProduct,
    removeProduct: removeProduct,
    getWarningForProduct: getWarningForProduct,
    upsertWarningForProduct: upsertWarningForProduct,
    deleteWarningForProduct: deleteWarningForProduct,
    listIngredients: listIngredients,
    replaceIngredients: replaceIngredients,
    getStats: getStats,
    startCheckout: startCheckout
  };

})(window);