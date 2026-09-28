import React from 'react';

const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'All Schemes' },
  { id: 'large-cap', name: 'Large Cap' },
  { id: 'mid-cap', name: 'Mid Cap' },
  { id: 'large-mid-cap', name: 'Large & Mid Cap' },
  { id: 'small-cap', name: 'Small Cap' },
  { id: 'multi-cap', name: 'Multi Cap' },
  { id: 'value', name: 'Value' },
  { id: 'flexi-cap', name: 'Flexi Cap' },
  { id: 'sectoral-thematic', name: 'Sectoral / Thematic' },
  { id: 'elss', name: 'ELSS' },
  { id: 'contra', name: 'Contra' },
  { id: 'dividend-yield', name: 'Dividend Yield' },
  { id: 'focused', name: 'Focused' },
  { id: 'index-funds', name: 'Index Funds' },
  { id: 'hybrid', name: 'Hybrid' },
  { id: 'debt-liquid', name: 'Debt / Liquid' }
];

const CategoryFilter = ({ activeCategory, onSelectCategory, categoriesList = [], categoryCounts = {}, totalSchemesCount = 0 }) => {
  const displayList = categoriesList && categoriesList.length > 0
    ? [{ id: 'all', name: 'All Schemes', count: totalSchemesCount }, ...categoriesList]
    : DEFAULT_CATEGORIES;

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-2 min-w-max">
        {displayList.map(cat => {
          const isSelected = activeCategory === cat.name || (activeCategory === 'all' && cat.id === 'all');
          const count = cat.count !== undefined 
            ? cat.count 
            : (categoryCounts[cat.name] || (cat.id === 'all' ? totalSchemesCount : 0));

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id === 'all' ? 'all' : cat.name)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/30 scale-[1.02]'
                  : 'glass-pill text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
              }`}
            >
              <span>{cat.name}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
