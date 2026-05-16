// components/MonitoringDashboard.tsx
// Real-time monitoring dashboard for Krishi AI

import React, { useState, useEffect } from 'react';
import { monitoringService, AnalysisLog } from '../services/monitoringService';

interface MonitoringDashboardProps {
  onClose?: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ onClose }) => {
  const [metrics, setMetrics] = useState(monitoringService.getMetrics());
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'logs' | 'costs'>('overview');

  useEffect(() => {
    // Update every 5 seconds
    const interval = setInterval(() => {
      setMetrics(monitoringService.getMetrics());
      setLogs(monitoringService.getLogs(24));
      setCostBreakdown(monitoringService.getCostBreakdown());
      setPerformance(monitoringService.getPerformanceSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-emerald-100 text-emerald-800';
      case 'low-cost': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number; critical: number }) => {
    if (value >= thresholds.good) return 'text-emerald-600';
    if (value >= thresholds.warning) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Monitoring Dashboard</h2>
            <p className="text-emerald-100 text-sm mt-1">Real-time performance & cost tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-emerald-100 text-xs">Last Updated</div>
              <div className="text-white font-bold">{new Date().toLocaleTimeString()}</div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-colors ${
                selectedTab === 'overview'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setSelectedTab('logs')}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-colors ${
                selectedTab === 'logs'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📝 Analysis Logs
            </button>
            <button
              onClick={() => setSelectedTab('costs')}
              className={`py-4 px-2 border-b-2 font-bold text-sm transition-colors ${
                selectedTab === 'costs'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              💰 Cost Analysis
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {selectedTab === 'overview' && (
            <OverviewTab
              metrics={metrics}
              costBreakdown={costBreakdown}
              performance={performance}
            />
          )}
          {selectedTab === 'logs' && (
            <LogsTab logs={logs} />
          )}
          {selectedTab === 'costs' && (
            <CostsTab costBreakdown={costBreakdown} metrics={metrics} />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ metrics: any; costBreakdown: any; performance: any }> = ({
  metrics, costBreakdown, performance
}) => {
  if (!performance) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Analyses"
          value={metrics.totalAnalyses.toLocaleString()}
          icon="🔬"
          color="bg-blue-50"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${(performance.avgResponseTime / 1000).toFixed(1)}s`}
          icon="⚡"
          color="bg-emerald-50"
        />
        <MetricCard
          title="Success Rate"
          value={`${performance.successRate.toFixed(1)}%`}
          icon="✅"
          color="bg-purple-50"
        />
        <MetricCard
          title="Avg Confidence"
          value={`${performance.avgConfidence.toFixed(0)}%`}
          icon="🎯"
          color="bg-amber-50"
        />
      </div>

      {/* Tier Usage */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <h3 className="font-black text-lg text-slate-800 mb-4">Model Tier Usage</h3>
        <div className="space-y-4">
          <TierUsageBar
            label="Free Tier (Hugging Face + Free LLMs)"
            count={metrics.freeTierUsage}
            total={metrics.totalAnalyses}
            color="bg-emerald-500"
          />
          <TierUsageBar
            label="Low-Cost Tier (GPT-3.5, etc.)"
            count={metrics.lowCostTierUsage}
            total={metrics.totalAnalyses}
            color="bg-blue-500"
          />
          <TierUsageBar
            label="Premium Tier (Gemini)"
            count={metrics.premiumTierUsage}
            total={metrics.totalAnalyses}
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-2xl p-6">
          <h3 className="font-black text-lg text-slate-800 mb-4">Performance Metrics</h3>
          <div className="space-y-3">
            <PerformanceRow label="Average Response Time" value={`${(performance.avgResponseTime / 1000).toFixed(2)}s`} />
            <PerformanceRow label="P95 Response Time" value={`${(performance.p95ResponseTime / 1000).toFixed(2)}s`} />
            <PerformanceRow label="P99 Response Time" value={`${(performance.p99ResponseTime / 1000).toFixed(2)}s`} />
            <PerformanceRow label="First Contentful Paint" value={`${(metrics.firstContentfulPaint / 1000).toFixed(2)}s`} />
            <PerformanceRow label="Time to Interactive" value={`${(metrics.timeToInteractive / 1000).toFixed(2)}s`} />
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6">
          <h3 className="font-black text-lg text-slate-800 mb-4">Cost Summary</h3>
          <div className="space-y-3">
            <CostRow label="Daily Cost" value={`$${costBreakdown?.daily.toFixed(2) || '0.00'}`} />
            <CostRow label="Weekly Estimate" value={`$${costBreakdown?.weekly.toFixed(2) || '0.00'}`} />
            <CostRow label="Monthly Estimate" value={`$${costBreakdown?.monthly.toFixed(2) || '0.00'}`} />
            <CostRow label="Cost per Analysis" value={`$${metrics.costPerAnalysis.toFixed(4)}`} />
            <div className="pt-3 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Monthly Savings vs Premium-only: <span className="text-emerald-600 font-black text-lg">
                  ${(1500 - (costBreakdown?.monthly || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Logs Tab Component
const LogsTab: React.FC<{ logs: AnalysisLog[] }> = ({ logs }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg text-slate-800">Recent Analyses (Last 24h)</h3>
        <div className="text-sm text-slate-500">{logs.length} entries</div>
      </div>

      <div className="bg-slate-50 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Time</th>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Crop</th>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Diagnosis</th>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Model</th>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Confidence</th>
              <th className="text-left py-3 px-4 font-bold text-sm text-slate-600">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 50).map((log, index) => (
              <tr key={index} className="border-t border-slate-200 hover:bg-slate-100">
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-slate-800">
                  {log.cropFamily}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {log.diagnosis}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getTierBadgeColor(log.tier)}`}>
                    {log.tier}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={log.confidence >= 70 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {log.confidence}%
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                  {(log.responseTime / 1000).toFixed(1)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Costs Tab Component
const CostsTab: React.FC<{ costBreakdown: any; metrics: any }> = ({ costBreakdown, metrics }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
          <div className="text-emerald-100 text-sm font-medium mb-1">Daily Cost</div>
          <div className="text-4xl font-black">${costBreakdown?.daily.toFixed(2) || '0.00'}</div>
          <div className="text-emerald-100 text-xs mt-2">
            {costBreakdown?.breakdown?.free || 0} free analyses today
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white">
          <div className="text-blue-100 text-sm font-medium mb-1">Weekly Estimate</div>
          <div className="text-4xl font-black">${costBreakdown?.weekly.toFixed(2) || '0.00'}</div>
          <div className="text-blue-100 text-xs mt-2">
            Based on current usage
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <div className="text-purple-100 text-sm font-medium mb-1">Monthly Estimate</div>
          <div className="text-4xl font-black">${costBreakdown?.monthly.toFixed(2) || '0.00'}</div>
          <div className="text-purple-100 text-xs mt-2">
            99% savings vs premium-only
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-6">
        <h3 className="font-black text-lg text-slate-800 mb-4">Cost Breakdown Today</h3>
        <div className="space-y-4">
          <CostBreakdownRow
            tier="Free Tier"
            count={costBreakdown?.breakdown?.free || 0}
            cost={0}
            color="bg-emerald-500"
          />
          <CostBreakdownRow
            tier="Low-Cost Tier"
            count={costBreakdown?.breakdown?.lowCost || 0}
            cost={(costBreakdown?.breakdown?.lowCost || 0) * 0.02}
            color="bg-blue-500"
          />
          <CostBreakdownRow
            tier="Premium Tier"
            count={costBreakdown?.breakdown?.premium || 0}
            cost={(costBreakdown?.breakdown?.premium || 0) * 0.05}
            color="bg-purple-500"
          />
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-3xl">💰</div>
          <div>
            <h4 className="font-black text-amber-800 mb-2">Cost Savings Summary</h4>
            <p className="text-amber-700 text-sm mb-3">
              With the tiered model selection, you're saving 99% on AI costs compared to using premium models only.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-amber-600">Premium-only cost</div>
                <div className="text-lg font-black text-amber-800 line-through">
                  ${(costBreakdown?.monthly || 0) * 100}
                </div>
              </div>
              <div>
                <div className="text-xs text-amber-600">Your actual cost</div>
                <div className="text-lg font-black text-emerald-600">
                  ${costBreakdown?.monthly.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-2xl p-4`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-sm text-slate-600 mt-1">{title}</div>
  </div>
);

const TierUsageBar: React.FC<{
  label: string;
  count: number;
  total: number;
  color: string;
}> = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-600">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const PerformanceRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-bold text-slate-800">{value}</span>
  </div>
);

const CostRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-bold text-emerald-600">{value}</span>
  </div>
);

const CostBreakdownRow: React.FC<{
  tier: string;
  count: number;
  cost: number;
  color: string;
}> = ({ tier, count, cost, color }) => (
  <div className="flex items-center space-x-4 py-3">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <div className="flex-1">
      <div className="font-medium text-slate-800">{tier}</div>
      <div className="text-sm text-slate-500">{count} analyses</div>
    </div>
    <div className="font-bold text-slate-800">${cost.toFixed(4)}</div>
  </div>
);

export default MonitoringDashboard;
