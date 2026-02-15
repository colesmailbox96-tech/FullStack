import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { DataQualityAnalyzer, type DataQualityReport } from '../testing/DataQualityAnalyzer';
import { TrainingDataExporter, type DatasetStats } from '../testing/TrainingDataExporter';
import { IntelligenceBenchmark, type BenchmarkReport } from '../testing/IntelligenceBenchmark';
import { ABComparison, type ABReport } from '../testing/ABComparison';
import { STANDARD_SCENARIOS } from '../testing/scenarios';
import { MLReadinessValidator, type MLReadinessReport } from '../testing/MLReadinessValidator';
import { PerformanceProfiler, type PerformanceCheckReport } from '../testing/PerformanceProfiler';
import type { DecisionLog } from '../data/DataLogger';

type TabId = 'quality' | 'benchmarks' | 'ab' | 'readiness' | 'performance';

interface TestingDashboardProps {
  visible: boolean;
  onClose: () => void;
  dataLog: DecisionLog[];
  performanceProfiler?: PerformanceProfiler;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'quality', label: 'Data Quality' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'ab', label: 'A/B Compare' },
  { id: 'readiness', label: 'ML Readiness' },
  { id: 'performance', label: 'Performance' },
];

const brain = new BehaviorTreeBrain();

const TestingDashboard: React.FC<TestingDashboardProps> = ({ visible, onClose, dataLog, performanceProfiler }) => {
  const [activeTab, setActiveTab] = useState<TabId>('quality');
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [abReport, setAbReport] = useState<ABReport | null>(null);
  const [readinessReport, setReadinessReport] = useState<MLReadinessReport | null>(null);
  const [perfReport, setPerfReport] = useState<PerformanceCheckReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Auto-update data quality every 100 ticks
  useEffect(() => {
    if (!visible || activeTab !== 'quality') return;
    const analyzer = new DataQualityAnalyzer();
    setQualityReport(analyzer.analyze(dataLog));
  }, [visible, activeTab, dataLog.length]);

  // Update performance live
  useEffect(() => {
    if (!visible || activeTab !== 'performance' || !performanceProfiler) return;
    const interval = setInterval(() => {
      setPerfReport(performanceProfiler.getReport());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, activeTab, performanceProfiler]);

  const runBenchmarks = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const benchmark = new IntelligenceBenchmark();
      setBenchmarkReport(benchmark.runAll(brain));
      setIsRunning(false);
    }, 10);
  }, []);

  const runABComparison = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const ab = new ABComparison();
      setAbReport(ab.compare(brain, brain, STANDARD_SCENARIOS.slice(0, 4)));
      setIsRunning(false);
    }, 10);
  }, []);

  const runReadiness = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const validator = new MLReadinessValidator();
      setReadinessReport(validator.validate(brain, dataLog));
      setIsRunning(false);
    }, 10);
  }, [dataLog]);

  const handleExportJSON = useCallback(() => {
    const exporter = new TrainingDataExporter();
    const json = exporter.exportAsJSON(dataLog);
    downloadFile(json, 'training_data.json', 'application/json');
  }, [dataLog]);

  const handleExportCSV = useCallback(() => {
    const exporter = new TrainingDataExporter();
    const csv = exporter.exportAsCSV(dataLog);
    downloadFile(csv, 'training_data.csv', 'text/csv');
  }, [dataLog]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">🧪 ML Testing Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'quality' && (
            <QualityTab report={qualityReport} dataLog={dataLog} onExportJSON={handleExportJSON} onExportCSV={handleExportCSV} />
          )}
          {activeTab === 'benchmarks' && (
            <BenchmarksTab report={benchmarkReport} isRunning={isRunning} onRun={runBenchmarks} />
          )}
          {activeTab === 'ab' && (
            <ABTab report={abReport} isRunning={isRunning} onRun={runABComparison} />
          )}
          {activeTab === 'readiness' && (
            <ReadinessTab report={readinessReport} isRunning={isRunning} onRun={runReadiness} />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab report={perfReport} />
          )}
        </div>
      </div>
    </div>
  );
};

/* ---- Sub-components ---- */

const ScoreGauge: React.FC<{ score: number; label?: string }> = ({ score, label }) => {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${color}`}>{score}</div>
      <div className="text-sm text-gray-400">{label ?? 'Score'}</div>
    </div>
  );
};

const CheckItem: React.FC<{ name: string; passed: boolean; score: number; detail: string; severity: string }> = ({ name, passed, score, detail, severity }) => {
  const icon = passed ? '✅' : severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : 'ℹ️';
  return (
    <div className="border border-gray-700 rounded p-3 mb-2">
      <div className="flex items-center justify-between">
        <span>{icon} <span className="font-medium">{name}</span></span>
        <span className={`text-sm ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}/100</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">{detail}</div>
    </div>
  );
};

const QualityTab: React.FC<{
  report: DataQualityReport | null;
  dataLog: DecisionLog[];
  onExportJSON: () => void;
  onExportCSV: () => void;
}> = ({ report, dataLog, onExportJSON, onExportCSV }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        {report && <ScoreGauge score={report.overallScore} label={report.passed ? 'PASSED' : 'FAILED'} />}
        <div className="text-sm text-gray-400">
          {dataLog.length} samples collected
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onExportJSON} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500">Export JSON</button>
        <button onClick={onExportCSV} className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-500">Export CSV</button>
      </div>
    </div>
    {report && report.checks.map((check, i) => (
      <CheckItem key={i} {...check} />
    ))}
  </div>
);

const BenchmarksTab: React.FC<{
  report: BenchmarkReport | null;
  isRunning: boolean;
  onRun: () => void;
}> = ({ report, isRunning, onRun }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        {report && (
          <>
            <div className={`text-5xl font-bold ${
              report.grade === 'A' ? 'text-green-400' :
              report.grade === 'B' ? 'text-blue-400' :
              report.grade === 'C' ? 'text-yellow-400' :
              'text-red-400'
            }`}>{report.grade}</div>
            <ScoreGauge score={report.overallScore} />
          </>
        )}
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Benchmarks'}
      </button>
    </div>
    {report && report.tests.map((test, i) => (
      <div key={i} className="border border-gray-700 rounded p-3 mb-2">
        <div className="flex items-center justify-between">
          <span>{test.passed ? '✅' : '❌'} <span className="font-medium">{test.name}</span></span>
          <span className={`text-sm ${test.passed ? 'text-green-400' : 'text-red-400'}`}>{test.score}/100</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">{test.description}</div>
        <div className="text-xs text-gray-500 mt-1">{test.detail}</div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${test.passed ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, test.score)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

const ABTab: React.FC<{
  report: ABReport | null;
  isRunning: boolean;
  onRun: () => void;
}> = ({ report, isRunning, onRun }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-medium">A/B Comparison</h3>
        <p className="text-sm text-gray-400">Compare behavior tree against itself (baseline)</p>
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Comparison'}
      </button>
    </div>
    {report && (
      <>
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold">
            Winner: {report.overallWinner === 'tie' ? '🤝 Tie' : `Brain ${report.overallWinner}`}
          </div>
          <div className="text-sm text-gray-400">{report.summary}</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2">Scenario</th>
              <th className="text-right py-2">Brain A</th>
              <th className="text-right py-2">Brain B</th>
              <th className="text-center py-2">Winner</th>
            </tr>
          </thead>
          <tbody>
            {report.scenarioResults.map((result, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2">{result.scenario}</td>
                <td className="text-right">{result.brainA.survivalTicks} ticks</td>
                <td className="text-right">{result.brainB.survivalTicks} ticks</td>
                <td className="text-center">{result.winner === 'tie' ? '🤝' : result.winner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
  </div>
);

const ReadinessTab: React.FC<{
  report: MLReadinessReport | null;
  isRunning: boolean;
  onRun: () => void;
}> = ({ report, isRunning, onRun }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        {report && (
          <div className={`text-3xl font-bold ${report.ready ? 'text-green-400' : 'text-red-400'}`}>
            {report.ready ? '✅ READY' : '❌ NOT READY'}
          </div>
        )}
        {report && <ScoreGauge score={report.overallScore} />}
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Check'}
      </button>
    </div>
    {report && (
      <>
        {report.blockers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-red-400 font-medium mb-2">🔴 Blockers</h4>
            {report.blockers.map((b, i) => (
              <div key={i} className="text-sm text-red-300 pl-4 mb-1">• {b}</div>
            ))}
          </div>
        )}
        {report.warnings.length > 0 && (
          <div className="mb-4">
            <h4 className="text-yellow-400 font-medium mb-2">🟡 Warnings</h4>
            {report.warnings.map((w, i) => (
              <div key={i} className="text-sm text-yellow-300 pl-4 mb-1">• {w}</div>
            ))}
          </div>
        )}
        {report.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="text-blue-400 font-medium mb-2">💡 Recommendations</h4>
            {report.recommendations.map((r, i) => (
              <div key={i} className="text-sm text-blue-300 pl-4 mb-1">• {r}</div>
            ))}
          </div>
        )}
        <h4 className="font-medium mb-2">Architecture Checks</h4>
        {report.sections.architectureCheck.checks.map((check, i) => (
          <div key={i} className="border border-gray-700 rounded p-2 mb-1 text-sm">
            {check.passed ? '✅' : '❌'} {check.name}: {check.detail}
          </div>
        ))}
      </>
    )}
  </div>
);

const PerformanceTab: React.FC<{ report: PerformanceCheckReport | null }> = ({ report }) => (
  <div>
    <h3 className="text-lg font-medium mb-4">Live Performance Metrics</h3>
    {report ? (
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Ticks/Second" value={report.ticksPerSecond.toFixed(1)} good={report.meetsTarget} />
        <MetricCard label="Decision Time" value={`${report.decisionMs.toFixed(3)}ms`} good={report.decisionMs < 0.5} />
        <MetricCard label="Perception Build" value={`${report.perceptionBuildMs.toFixed(3)}ms`} good={report.perceptionBuildMs < 0.5} />
        <MetricCard label="Data Log Time" value={`${report.dataLogMs.toFixed(3)}ms`} good={report.dataLogMs < 1} />
        <MetricCard label="Memory Usage" value={`${report.memoryUsageMB.toFixed(1)}MB`} good={report.memoryUsageMB < 100} />
        <MetricCard label="Meets Target" value={report.meetsTarget ? 'YES' : 'NO'} good={report.meetsTarget} />
      </div>
    ) : (
      <p className="text-gray-400">No performance data yet. Run the simulation to collect metrics.</p>
    )}
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; good: boolean }> = ({ label, value, good }) => (
  <div className={`border rounded p-4 ${good ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
    <div className="text-sm text-gray-400">{label}</div>
    <div className={`text-2xl font-bold ${good ? 'text-green-400' : 'text-red-400'}`}>{value}</div>
  </div>
);

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default TestingDashboard;
