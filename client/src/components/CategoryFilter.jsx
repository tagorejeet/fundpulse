import React from 'react';

const CATEGORIES = [
  { id: 'all', name: 'All Schemes', count: 34 },
  { id: 'large-cap', name: 'Large Cap', count: 4 },
  { id: 'mid-cap', name: 'Mid Cap', count: 4 },
  { id: 'large-mid-cap', name: 'Large & Mid Cap', count: 3 },
  { id: 'small-cap', name: 'Small Cap', count: 4 },
  { id: 'multi-cap', name: 'Multi Cap', count: 5 },
  { id: 'value', name: 'Value', count: 5 },
  { id: 'flexi-cap', name: 'Flexi Cap', count: 5 },
  { id: 'sectoral-thematic', name: 'Sectoral / Thematic', count: 4 }
];

const CategoryFilter = ({ activeCategory, onSelectCategory, categoryCounts }) => {
  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-2 min-w-max">
        {CATEGORIES.map(cat => {
          const isSelected = activeCategory === cat.name || (activeCategory === 'all' && cat.id === 'all');
          const count = categoryCounts[cat.name] !== undefined 
            ? categoryCounts[cat.name] 
            : (cat.id === 'all' ? 34 : cat.count);

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
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
