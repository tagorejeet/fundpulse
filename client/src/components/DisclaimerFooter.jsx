import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

const DisclaimerFooter = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 mt-12 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-start gap-2.5 max-w-3xl">
          <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-300">Data Source Disclaimer:</span> Mutual fund performance metrics, NAVs, and AUM figures are sourced dynamically from Association of Mutual Funds in India (AMFI). Data is provided strictly for informational and analytical purposes only and should not be considered investment advice, recommendation, or solicitation to buy or sell any financial security.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>FundPulse © 2026 • 34-Fund Master Allowlist</span>
        </div>

      </div>
    </footer>
  );
};

export default DisclaimerFooter;
