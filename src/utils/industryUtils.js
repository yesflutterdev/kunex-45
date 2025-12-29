const Industry = require('../models/industry.model');

async function incrementIndustryViewCount(industryId, subIndustryId = null) {
  try {
    if (!industryId) {
      return null;
    }

    const industry = await Industry.findByIdAndUpdate(
      industryId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    
    if (!industry) {
      console.warn(`Industry with ID ${industryId} not found for view count increment`);
      return null;
    }
    
    return industry;
  } catch (error) {
    console.error('Error incrementing industry view count:', error);
    return null;
  }
}

async function getIndustryById(industryId) {
  try {
    if (!industryId) {
      return null;
    }
    
    const industry = await Industry.findById(industryId);
    return industry;
  } catch (error) {
    console.error('Error fetching industry:', error);
    return null;
  }
}

async function validateIndustryAndSubcategory(industryId, subIndustryId = null) {
  try {
    if (!industryId) {
      return { valid: false, industry: null, error: 'Industry ID is required' };
    }

    const industry = await Industry.findById(industryId);
    
    if (!industry) {
      return { valid: false, industry: null, error: 'Industry not found' };
    }

    if (!industry.isActive) {
      return { valid: false, industry: null, error: 'Industry is not active' };
    }

    if (subIndustryId) {
      const subcategory = industry.subcategories.find(sub => sub.id === subIndustryId);
      if (!subcategory) {
        return { 
          valid: false, 
          industry: null, 
          error: `Subcategory with ID "${subIndustryId}" not found in industry "${industry.title}"` 
        };
      }
    }

    return { valid: true, industry, error: null };
  } catch (error) {
    console.error('Error validating industry:', error);
    return { valid: false, industry: null, error: error.message };
  }
}

module.exports = {
  incrementIndustryViewCount,
  getIndustryById,
  validateIndustryAndSubcategory
};

