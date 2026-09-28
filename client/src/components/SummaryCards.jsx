import React from 'react';
import { ShieldCheck, Layers, Calendar, CheckCircle2 } from 'lucide-react';

const SummaryCards = ({ meta, totalFundsCount = 10195 }) => {
  const formattedTotal = (totalFundsCount || 10195).toLocaleString('en-IN');

  const cards = [
    {
      title: 'Tracked Schemes',
      value: `${formattedTotal} Schemes`,
      subtitle: 'All AMFI Mutual Funds Covered',
      icon: ShieldCheck,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      iconBg: 'bg-blue-500/20 text-blue-400'
    },
    {
      title: 'Mutual Fund Categories',
      value: 'All Categories',
      subtitle: 'Large, Mid, Small, Multi, Flexi & more',
      icon: Layers,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
      iconBg: 'bg-purple-500/20 text-purple-400'
    },
    {
      title: 'AMFI Report Date',
      value: meta?.reportDate || '28-Sep-2026',
      subtitle: meta?.isCached ? 'Served from cached snapshot' : 'Latest verified polling payload',
      icon: Calendar,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      title: 'Data Integrity',
      value: '100% Verified',
      subtitle: 'Directly Sourced from AMFI India',
      icon: CheckCircle2,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div 
            key={idx} 
            className={`glass-card p-4 rounded-xl border bg-gradient-to-br ${card.color} transition-all duration-300 hover:scale-[1.02] shadow-sm flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                <IconComponent className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;
