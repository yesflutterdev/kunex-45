const Industry = require('../models/industry.model');

/**
 * Get all industries with optional filtering
 */
exports.getIndustries = async (req, res, next) => {
  try {
    const { type, isActive = 'true' } = req.query;

    const query = {};
    
    if (type) {
      query.type = { $in: [type, 'both'] };
    }
    
    if (isActive === 'true' || isActive === true) {
      query.isActive = true;
    }

    const industries = await Industry.find(query)
      .select('title type subcategories viewCount image isActive')
      .sort({ title: 1 })
      .lean();

    const business = industries.filter(ind => ind.type === 'business');
    const professional = industries.filter(ind => ind.type === 'individual');
    const both = industries.filter(ind => ind.type === 'both');
    
    const responseData = {
      business: [...business, ...both],
      professional: [...professional, ...both],
      total: industries.length
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

exports.getIndustryById = async (req, res, next) => {
  try {
    const { industryId } = req.params;

    const industry = await Industry.findById(industryId);
    
    if (!industry) {
      return res.status(404).json({
        success: false,
        message: 'Industry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        industry
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getIndustriesByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!['business', 'individual'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "business" or "individual"'
      });
    }

    const industries = await Industry.find({
      type: { $in: [type, 'both'] },
      isActive: true
    })
      .select('title type subcategories viewCount image')
      .sort({ title: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        industries,
        type,
        total: industries.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.searchIndustries = async (req, res, next) => {
  try {
    const { q, type } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const query = {
      title: { $regex: q, $options: 'i' },
      isActive: true
    };

    if (type && ['business', 'individual'].includes(type)) {
      query.type = { $in: [type, 'both'] };
    }

    const industries = await Industry.find(query)
      .select('title type subcategories viewCount image')
      .sort({ viewCount: -1, title: 1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        industries,
        query: q,
        total: industries.length
      }
    });
  } catch (error) {
    next(error);
  }
};

