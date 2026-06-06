const Category = require('../category/category.model');
const Food     = require('../foods/food.model');
const Table    = require('../tables/table.model');

// GET /api/v1/bootstrap
// Returns all semi-static data in one batched request.
// Cache-Control: s-maxage=300 (CDN), stale-while-revalidate=600
exports.getBootstrap = async (req, res, next) => {
  try {
    // Fire all queries in parallel
    const [categories, featuredFoods, tables] = await Promise.all([
      Category.find().sort('position').lean(),
      Food.find({ isFeatured: true })
        .populate('category', 'title slug')
        .limit(24)
        .lean(),
      Table.find({ isActive: true })
        .populate('currentSession', 'seatedAt partySize serverName status checkId')
        .sort('label')
        .lean(),
    ]);

    // Group featured foods by category for quick access
    const productsByCategory = {};
    featuredFoods.forEach(f => {
      const catId = f.category?._id?.toString() ?? 'uncategorised';
      if (!productsByCategory[catId]) productsByCategory[catId] = [];
      productsByCategory[catId].push(f);
    });

    const payload = {
      categories,
      featuredFoods,
      productsByCategory,
      tables,
      venue: {
        name:               process.env.VENUE_NAME || 'Gourmet Kitchen',
        currency:           'USD',
        taxRate:            0.095,
        serviceChargeRate:  0.18,
        timezone:           'America/New_York',
      },
      serverTimestamp: Date.now(),
    };

    res.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};
