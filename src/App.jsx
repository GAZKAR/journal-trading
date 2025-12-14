import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, Activity, AlertTriangle, BookOpen, Save, BarChart3, LineChart, PieChart, Calendar, Cloud, Download } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE (Vos clés sont intégrées ici) ---
const firebaseConfig = {
  apiKey: "AIzaSyCK-XOt0nCsbbYzWlQwTCv8Ip5HVg4ZlX8",
  authDomain: "mon-journal-trading-mike.firebaseapp.com",
  projectId: "mon-journal-trading-mike",
  storageBucket: "mon-journal-trading-mike.firebasestorage.app",
  messagingSenderId: "497280243618",
  appId: "1:497280243618:web:9445bec3145f4642c144fb",
  measurementId: "G-BMJ7F3NKQH"
};

const appId = "mon-journal-v1"; 

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main Component ---
export default function TradingJournal() {
  const [trades, setTrades] = useState([]);
  const [showStrategy, setShowStrategy] = useState(false);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- Auth & Data Persistence ---
  useEffect(() => {
    const initAuth = async () => {
        // Connexion anonyme simple pour commencer
        await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const tradesCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'trades');
    const unsubscribe = onSnapshot(tradesCollection, (snapshot) => {
      const loadedTrades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Tri par date (plus récent en premier)
      loadedTrades.sort((a, b) => b.timestamp - a.timestamp);
      setTrades(loadedTrades);
    }, (error) => {
      console.error("Erreur de chargement:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    if (today === 'Saturday' || today === 'Sunday') return 'Monday';
    return today;
  };

  const [formData, setFormData] = useState({
    pair: 'EURUSD',
    day: getCurrentDay(),
    strategy: ['NFT Bearish'],
    phase: 'Phase 1',
    entryModel: 'PT M5',
    quality: 'A',
    isLive: true,
    risk: 1.0,
    outcome: 'Running',
    notes: ''
  });

  const stats = {
    totalTrades: trades.length,
    catchedLive: trades.filter(t => t.isLive).length,
    cSetups: trades.filter(t => t.quality === 'C').length,
    totalRisk: trades.reduce((acc, curr) => acc + curr.risk, 0),
    winRate: trades.length > 0 
      ? Math.round((trades.filter(t => t.outcome === 'Win').length / trades.filter(t => t.outcome !== 'Running').length || 1) * 100) 
      : 0
  };

  const toggleStrategy = (strat) => {
    setFormData(prev => {
      const current = prev.strategy;
      if (current.includes(strat)) {
        return { ...prev, strategy: current.filter(s => s !== strat) };
      } 
      if (current.length < 2) {
        return { ...prev, strategy: [...current, strat] };
      }
      return prev;
    });
  };

  const handleAddTrade = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const newTrade = {
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' }),
        ...formData
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trades'), newTrade);
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trades', id));
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  const handleExportCSV = () => {
    if (trades.length === 0) return;
    const headers = ['Date', 'Jour', 'Paire', 'Strategies', 'Phase', 'Modele Entree', 'Qualite', 'Live', 'Risque (%)', 'Resultat'];
    const rows = trades.map(t => [
      t.date,
      t.day,
      t.pair,
      t.strategy.join(' + '),
      t.phase,
      t.entryModel,
      t.quality,
      t.isLive ? 'OUI' : 'NON',
      t.risk,
      t.outcome
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trading_journal_export_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStratColor = (strat) => {
    if (strat === 'UCB') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (strat === '4H OFR Bearish') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (strat === '4H OFR Bullish') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';

    const isBearish = strat.includes('Bearish');
    
    if (strat.includes('NFT')) {
      return isBearish 
        ? 'bg-purple-500/10 text-red-400 border-red-500/20' 
        : 'bg-purple-500/10 text-teal-400 border-teal-500/20';
    }
    if (strat.includes('SRFT')) {
      return isBearish 
        ? 'bg-orange-500/10 text-red-400 border-red-500/20' 
        : 'bg-orange-500/10 text-teal-400 border-teal-500/20';
    }
    if (strat.includes('FT')) {
      return isBearish 
        ? 'bg-emerald-500/10 text-red-400 border-red-500/20' 
        : 'bg-emerald-500/10 text-teal-400 border-teal-500/20'; 
    }
    return 'bg-slate-800 text-slate-400';
  };

  const getEquityCurvePoints = () => {
    const chronologicalTrades = [...trades].reverse();
    let currentR = 0;
    const points = [{ x: 0, y: 0, label: 'Start' }];
    chronologicalTrades.forEach((t, i) => {
      let rChange = 0;
      if (t.outcome === 'Win') rChange = 2;
      else if (t.outcome === 'Loss') rChange = -1;
      currentR += rChange;
      points.push({ x: i + 1, y: currentR, label: t.date });
    });
    return points;
  };

  const equityData = getEquityCurvePoints();
  const minR = Math.min(...equityData.map(p => p.y), 0);
  const maxR = Math.max(...equityData.map(p => p.y), 1);
  const yDomainMin = minR - 1;
  const yDomainMax = maxR + 1;
  const rangeR = yDomainMax - yDomainMin;

  const paddingLeft = 15;
  const paddingRight = 5;
  const paddingTop = 5;
  const paddingBottom = 5;
  
  const width = 100;
  const height = 100;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const scaleY = (val) => {
    const percent = (val - yDomainMin) / rangeR;
    return (height - paddingBottom) - (percent * graphHeight);
  };
  
  const scaleX = (index) => {
    const count = equityData.length - 1 || 1;
    return paddingLeft + (index / count) * graphWidth;
  };

  const svgPath = equityData.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.y)}`
  ).join(' ');

  const yTicks = [];
  for (let i = Math.floor(yDomainMin); i <= Math.ceil(yDomainMax); i++) {
    yTicks.push(i);
  }

  const xTickInterval = Math.max(1, Math.ceil((equityData.length - 1) / 5));
  const xTicks = equityData.filter((_, i) => i % xTickInterval === 0);

  const stratList = [
    'UCB', 'NFT Bullish', 'NFT Bearish', 'FT Bullish', 'FT Bearish', 
    'SRFT Bullish', 'SRFT Bearish', '4H OFR Bullish', '4H OFR Bearish'
  ];

  const stratStats = stratList.map(s => ({
    name: s,
    count: trades.filter(t => t.strategy.includes(s)).length
  }));

  const dayList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayStats = dayList.map(d => ({
    name: d,
    count: trades.filter(t => t.day === d).length
  }));

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-200">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-indigo-500" />
            Suivi Hebdomadaire
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            Stratégie: OFR / Fractal Sweep / SMA 200
            {user && <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
              <Cloud className="h-3 w-3" /> Sauvegarde Cloud Active
            </span>}
          </p>
        </div>
        <button 
          onClick={() => setShowStrategy(!showStrategy)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-sm hover:bg-slate-800 transition-colors text-sm font-medium text-slate-200"
        >
          <BookOpen className="h-4 w-4" />
          {showStrategy ? 'Masquer Règles' : 'Voir Stratégie'}
        </button>
      </div>

      {/* Strategy Reference Card */}
      {showStrategy && (
        <div className="max-w-6xl mx-auto mb-8 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-3 text-indigo-400">Définitions Bias</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-red-500">
                  <span className="font-bold block text-slate-200">4H OFR (Bearish/Bullish)</span>
                  Contextual Market Structure bias.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-blue-500">
                  <span className="font-bold block text-slate-200">UCB</span>
                  Only PT 4H OFR trade.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-purple-500">
                  <span className="font-bold block text-slate-200">NFT (No Follow Thru)</span>
                  2 opposing 4H body/wick close on shift point.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-emerald-500">
                  <span className="font-bold block text-slate-200">FT (Follow Thru)</span>
                  2 4H body close. Mostly FT = 4H OFR.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg border-l-4 border-orange-500">
                  <span className="font-bold block text-slate-200">SRFT (Strong Follow Thru)</span>
                  Recovery + HTFSTRLQ sweep.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3 text-indigo-400">Phases d'Entrée</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="p-3 bg-slate-800/50 rounded-lg">
                  <span className="font-bold text-slate-200">Phase 1 :</span> Look for 1 trade entry after bias confirmed.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg">
                  <span className="font-bold text-slate-200">Phase 2 :</span> Look for entry only PT M15 OFR or M5 SMA 200.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg">
                  <span className="font-bold text-slate-200">Phase 3 :</span> Look for 1 entry after 4H fractal WP sweep.
                </li>
                <li className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <span className="font-bold text-slate-200">PT 4H OFR :</span> Pro Trend 4H OFR (Follows main trend).
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de Trades</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalTrades}</p>
            </div>
            <Activity className="h-5 w-5 text-indigo-500" />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catched Live</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold text-white">{stats.catchedLive}</p>
                <span className="text-sm text-slate-500">
                  ({stats.totalTrades > 0 ? Math.round((stats.catchedLive / stats.totalTrades) * 100) : 0}%)
                </span>
              </div>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Setup 'C' (Faible)</p>
              <p className={`text-3xl font-bold mt-2 ${stats.cSetups > 2 ? 'text-red-400' : 'text-white'}`}>
                {stats.cSetups}
              </p>
            </div>
            <AlertTriangle className={`h-5 w-5 ${stats.cSetups > 0 ? 'text-orange-500' : 'text-slate-700'}`} />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Risque Total</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalRisk.toFixed(1)}%</p>
            </div>
            <div className="h-5 w-5 text-emerald-500 font-bold text-xs border-2 border-emerald-500 rounded-full flex items-center justify-center">R</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-500" />
              Nouveau Trade
            </h2>
            
            <form onSubmit={handleAddTrade} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Paire</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600"
                    placeholder="ex: EURUSD"
                    value={formData.pair}
                    onChange={(e) => setFormData({...formData, pair: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Jour</label>
                  <select 
                    className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white outline-none"
                    value={formData.day}
                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                  >
                    {dayList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Risque (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.risk}
                  onChange={(e) => setFormData({...formData, risk: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-medium text-slate-400">Stratégie (Bias)</label>
                  <span className="text-[10px] text-slate-500 font-medium">Max 2 choix</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* UCB is standalone */}
                  <div className="col-span-2">
                     <button
                        type="button"
                        onClick={() => toggleStrategy('UCB')}
                        className={`w-full py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                          formData.strategy.includes('UCB') 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/50' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        } ${(!formData.strategy.includes('UCB') && formData.strategy.length >= 2) ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        UCB (Neutral/Unconfirmed)
                      </button>
                  </div>

                  {/* Grouped Bullish / Bearish */}
                  <div className="col-span-2 text-[10px] font-bold text-slate-500 mt-2 flex justify-between px-1">
                     <span>BULLISH (Long)</span>
                     <span>BEARISH (Short)</span>
                  </div>

                  {/* NFT */}
                  <button type="button" onClick={() => toggleStrategy('NFT Bullish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('NFT Bullish') ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('NFT Bullish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >NFT Bullish</button>
                  <button type="button" onClick={() => toggleStrategy('NFT Bearish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('NFT Bearish') ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('NFT Bearish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >NFT Bearish</button>

                  {/* FT */}
                  <button type="button" onClick={() => toggleStrategy('FT Bullish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('FT Bullish') ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('FT Bullish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >FT Bullish</button>
                  <button type="button" onClick={() => toggleStrategy('FT Bearish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('FT Bearish') ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('FT Bearish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >FT Bearish</button>

                  {/* SRFT */}
                  <button type="button" onClick={() => toggleStrategy('SRFT Bullish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('SRFT Bullish') ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('SRFT Bullish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >SRFT Bullish</button>
                  <button type="button" onClick={() => toggleStrategy('SRFT Bearish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('SRFT Bearish') ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('SRFT Bearish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >SRFT Bearish</button>

                  {/* 4H OFR */}
                  <div className="col-span-2 border-t border-slate-800 my-1"></div>
                  
                  <button type="button" onClick={() => toggleStrategy('4H OFR Bullish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('4H OFR Bullish') ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('4H OFR Bullish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >4H OFR Bullish</button>
                  <button type="button" onClick={() => toggleStrategy('4H OFR Bearish')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                      formData.strategy.includes('4H OFR Bearish') ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    } ${(!formData.strategy.includes('4H OFR Bearish') && formData.strategy.length >= 2) ? 'opacity-30' : ''}`}
                  >4H OFR Bearish</button>

                </div>
                {formData.strategy.length === 0 && (
                   <p className="text-[10px] text-red-400 mt-1">Sélectionnez au moins une stratégie.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phase d'Entrée</label>
                  <select 
                    className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white outline-none"
                    value={formData.phase}
                    onChange={(e) => setFormData({...formData, phase: e.target.value})}
                  >
                    <option value="Phase 1">Phase 1 (Bias Confirmed)</option>
                    <option value="Phase 2">Phase 2 (M15 OFR / M5 SMA)</option>
                    <option value="Phase 3">Phase 3 (4H Fractal WP)</option>
                    <option value="PT 4H OFR">PT 4H OFR (Pro Trend)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Modèle d'Entrée</label>
                  <select 
                    className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white outline-none"
                    value={formData.entryModel}
                    onChange={(e) => setFormData({...formData, entryModel: e.target.value})}
                  >
                    <option value="PT M5">PT M5</option>
                    <option value="PT M15">PT M15</option>
                    <option value="CT M15">CT M15</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Qualité Setup</label>
                  <select 
                    className={`w-full p-2 border rounded-lg text-sm bg-slate-950 text-white outline-none ${formData.quality === 'C' ? 'border-red-500/50 text-red-400' : 'border-slate-700'}`}
                    value={formData.quality}
                    onChange={(e) => setFormData({...formData, quality: e.target.value})}
                  >
                    <option value="A">A (Haute)</option>
                    <option value="B">B (Moyenne)</option>
                    <option value="C">C (Faible/Risqué)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Résultat</label>
                  <select 
                    className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-950 text-white outline-none"
                    value={formData.outcome}
                    onChange={(e) => setFormData({...formData, outcome: e.target.value})}
                  >
                    <option value="Running">En cours</option>
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-slate-800 rounded-lg bg-slate-950">
                <input 
                  type="checkbox" 
                  id="liveCheck"
                  checked={formData.isLive}
                  onChange={(e) => setFormData({...formData, isLive: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-indigo-500"
                />
                <label htmlFor="liveCheck" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Catched Live (Exécution en direct)
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:text-slate-400 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/30 transition-all flex justify-center items-center gap-2"
              >
                {isSaving ? <Activity className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Enregistrement...' : 'Enregistrer le Trade'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Table + Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Table List */}
          <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="font-bold text-slate-200">Journal de la Semaine</h3>
                <div className="flex gap-4 items-center">
                    <span className="text-xs text-slate-500 hidden sm:inline">Ordre chronologique inversé</span>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-slate-700"
                        title="Télécharger en CSV (Excel)"
                    >
                        <Download className="h-3 w-3" />
                        Exporter CSV
                    </button>
                </div>
             </div>
             
             {trades.length === 0 ? (
               <div className="p-12 text-center text-slate-500">
                 {user ? (
                   <>
                     <p>Aucun trade enregistré pour le moment.</p>
                     <p className="text-sm mt-2 text-slate-600">Les données seront synchronisées dans le cloud.</p>
                   </>
                 ) : (
                   <p className="flex items-center justify-center gap-2"><Activity className="animate-spin h-4 w-4"/> Connexion au cloud...</p>
                 )}
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="text-xs font-semibold text-slate-500 border-b border-slate-800 bg-slate-950">
                       <th className="p-4">Date</th>
                       <th className="p-4">Day</th>
                       <th className="p-4">Setup</th>
                       <th className="p-4">Phase</th>
                       <th className="p-4">Modèle</th>
                       <th className="p-4 text-center">Qualité</th>
                       <th className="p-4 text-center">Live?</th>
                       <th className="p-4 text-center">Risque</th>
                       <th className="p-4 text-center">Résultat</th>
                       <th className="p-4"></th>
                     </tr>
                   </thead>
                   <tbody className="text-sm">
                     {trades.map((trade) => (
                       <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                         <td className="p-4 font-medium text-slate-200">
                           {trade.pair} <br/>
                           <span className="text-xs text-slate-500 font-normal">{trade.date}</span>
                         </td>
                         <td className="p-4 text-slate-400 font-medium">
                           {trade.day.substring(0, 3)}
                         </td>
                         <td className="p-4">
                           <div className="flex flex-wrap gap-1">
                             {trade.strategy.map((strat, index) => (
                               <span key={index} className={`px-2 py-1 rounded text-[10px] font-bold border ${getStratColor(strat)}`}>
                                 {strat}
                               </span>
                             ))}
                           </div>
                         </td>
                         <td className="p-4 text-slate-400">{trade.phase}</td>
                         <td className="p-4 text-slate-400 font-mono text-xs">{trade.entryModel}</td>
                         <td className="p-4 text-center">
                           <span className={`inline-block w-6 h-6 leading-6 rounded-full text-xs font-bold ${
                             trade.quality === 'C' ? 'bg-red-500/20 text-red-400' : 
                             trade.quality === 'A' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                           }`}>
                             {trade.quality}
                           </span>
                         </td>
                         <td className="p-4 text-center">
                           {trade.isLive ? (
                             <span className="text-emerald-400 text-xs font-bold">OUI</span>
                           ) : (
                             <span className="text-slate-600 text-xs">NON</span>
                           )}
                         </td>
                         <td className="p-4 text-center font-mono text-slate-400">{trade.risk}%</td>
                         <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              trade.outcome === 'Win' ? 'bg-emerald-500/20 text-emerald-400' :
                              trade.outcome === 'Loss' ? 'bg-red-500/20 text-red-400' :
                              trade.outcome === 'BE' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {trade.outcome}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                           <button 
                             onClick={() => handleDelete(trade.id)}
                             className="text-slate-600 hover:text-red-400 transition-colors p-1"
                             title="Supprimer"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>

          {/* Analyse Section */}
          <div className="grid grid-cols-1 gap-6">
            
            {/* Chart Card - Full Width */}
            <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
               <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                 <LineChart className="h-5 w-5 text-indigo-500" />
                 Progression Estimée (R)
               </h3>
               {trades.length > 0 ? (
                 <div className="w-full h-48 relative">
                   <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
                     {/* Y-Axis Line */}
                     <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#334155" strokeWidth="1" />
                     {/* X-Axis Line */}
                     <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#334155" strokeWidth="1" />
                     
                     {/* Zero Line if visible */}
                     {minR < 0 && maxR > 0 && (
                        <line x1={paddingLeft} y1={scaleY(0)} x2={width - paddingRight} y2={scaleY(0)} stroke="#475569" strokeWidth="0.5" strokeDasharray="2" />
                     )}
                     
                     {/* Y-Axis Ticks & Labels */}
                     {yTicks.map(val => (
                       <g key={`y-${val}`}>
                         <line x1={paddingLeft - 2} y1={scaleY(val)} x2={paddingLeft} y2={scaleY(val)} stroke="#475569" strokeWidth="1" />
                         <text x={paddingLeft - 4} y={scaleY(val)} alignmentBaseline="middle" textAnchor="end" fontSize="4" fill="#94a3b8">{val}R</text>
                       </g>
                     ))}

                     {/* X-Axis Ticks (No Labels) */}
                     {xTicks.map((point, index) => {
                       const originalIndex = equityData.indexOf(point);
                       return (
                         <g key={`x-${index}`}>
                           <line x1={scaleX(originalIndex)} y1={height - paddingBottom} x2={scaleX(originalIndex)} y2={height - paddingBottom + 2} stroke="#475569" strokeWidth="1" />
                         </g>
                       )
                     })}

                     <path d={svgPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                     
                     {equityData.map((p, i) => (
                       <g key={i} className="group">
                        <circle cx={scaleX(i)} cy={scaleY(p.y)} r="1.5" className="fill-slate-900 stroke-indigo-500 stroke-2 hover:r-3 transition-all cursor-pointer" />
                       </g>
                     ))}
                   </svg>
                 </div>
               ) : (
                 <div className="h-40 flex items-center justify-center text-slate-600 text-sm italic border border-dashed border-slate-800 rounded-lg">
                   En attente de données...
                 </div>
               )}
            </div>

            {/* Two Columns for Distributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Distribution Stratégies */}
              <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                 <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                   <PieChart className="h-5 w-5 text-purple-500" />
                   Distribution Stratégies
                 </h3>
                 {trades.length > 0 ? (
                   <div className="space-y-3">
                     {stratStats.map(s => (
                       s.count > 0 && (
                         <div key={s.name}>
                           <div className="flex justify-between text-xs mb-1">
                             <span className="font-medium text-slate-300">{s.name}</span>
                             <span className="text-slate-500">{s.count}</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-2">
                             <div 
                               className={`h-2 rounded-full ${
                                 s.name.includes('Bearish') ? 'bg-red-500' :
                                 s.name.includes('Bullish') ? 'bg-teal-500' :
                                 s.name.includes('FT') ? 'bg-emerald-500' :
                                 s.name.includes('NFT') ? 'bg-purple-500' : 'bg-indigo-500'
                               }`}
                               style={{ width: `${(s.count / trades.length) * 100}%` }}
                             ></div>
                           </div>
                         </div>
                       )
                     ))}
                   </div>
                 ) : (
                   <div className="h-40 flex items-center justify-center text-slate-600 text-sm italic border border-dashed border-slate-800 rounded-lg">
                     Aucune statistique...
                   </div>
                 )}
              </div>

              {/* Distribution Jours */}
              <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
                 <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                   <Calendar className="h-5 w-5 text-orange-500" />
                   Performance par Jour
                 </h3>
                 {trades.length > 0 ? (
                   <div className="space-y-3">
                     {dayStats.map(d => (
                         <div key={d.name}>
                           <div className="flex justify-between text-xs mb-1">
                             <span className={`font-medium ${d.count > 0 ? 'text-slate-300' : 'text-slate-600'}`}>{d.name}</span>
                             <span className="text-slate-500">{d.count}</span>
                           </div>
                           <div className="w-full bg-slate-800 rounded-full h-2">
                             <div 
                               className="h-2 rounded-full bg-orange-500 transition-all duration-500"
                               style={{ width: `${trades.length > 0 ? (d.count / trades.length) * 100 : 0}%` }}
                             ></div>
                           </div>
                         </div>
                     ))}
                   </div>
                 ) : (
                   <div className="h-40 flex items-center justify-center text-slate-600 text-sm italic border border-dashed border-slate-800 rounded-lg">
                     Aucune statistique...
                   </div>
                 )}
              </div>

            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}
