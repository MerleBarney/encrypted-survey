"use client";

import { useState, useEffect } from "react";
import { useEncryptedSurvey, SurveyInfo } from "@/hooks/useEncryptedSurvey";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { ethers } from "ethers";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SurveyResultsProps {
  surveyId: bigint;
  surveyInfo: SurveyInfo;
  onBack: () => void;
}

export const SurveyResults = ({
  surveyId,
  surveyInfo,
  onBack,
}: SurveyResultsProps) => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const {
    loadTotalResponses,
    decryptTotalResponses,
    isDecrypting,
    canDecrypt,
    decryptedTotalResponses,
    totalResponsesHandle,
    message,
    loadAllQuestionResults,
    decryptAllQuestionResults,
    getSurveyQuestions,
    questionResultHandles,
    decryptedQuestionResults,
  } = useEncryptedSurvey({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [questionsMeta, setQuestionsMeta] = useState<
    Array<{ text: string; type: number; options: string[] }>
  >([]);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      await loadTotalResponses(surveyId);
      const metas: Array<{ text: string; type: number; options: string[] }> = [];
      for (let i = 0; i < Number(surveyInfo.questionCount); i++) {
        const q = await getSurveyQuestions(surveyId, i);
        if (q) {
          metas.push({ text: q.text, type: q.type, options: q.options });
        }
      }
      setQuestionsMeta(metas);
      await loadAllQuestionResults(surveyId);
    };
    load();
  }, [surveyId, surveyInfo.questionCount, loadTotalResponses, getSurveyQuestions, loadAllQuestionResults]);

  // Auto refresh feature - refresh results every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(async () => {
      await loadTotalResponses(surveyId);
      await loadAllQuestionResults(surveyId);
      if (decryptedQuestionResults && decryptedQuestionResults.length > 0) {
        // If already decrypted before, automatically re-decrypt to get latest data
        await decryptAllQuestionResults(surveyId);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [autoRefresh, surveyId, loadTotalResponses, loadAllQuestionResults, decryptedQuestionResults, decryptAllQuestionResults]);

  const handleDecrypt = async () => {
    await decryptTotalResponses(surveyId);
  };

  const handleDecryptAll = async () => {
    await decryptAllQuestionResults(surveyId);
  };

  // Helper function to generate chart data
  const generateChartData = (labels: string[], values: bigint[], questionType: number) => {
    const numericValues = values.map((v) => Number(v));
    
    // Choose different color schemes for different question types
    const colorSchemes = {
      singleChoice: [
        "rgba(59, 130, 246, 0.8)",  // Blue
        "rgba(16, 185, 129, 0.8)",  // Green
        "rgba(251, 146, 60, 0.8)",  // Orange
        "rgba(239, 68, 68, 0.8)",   // Red
        "rgba(168, 85, 247, 0.8)",  // Purple
        "rgba(236, 72, 153, 0.8)",  // Pink
        "rgba(14, 165, 233, 0.8)",  // Sky blue
        "rgba(132, 204, 22, 0.8)",  // Lime
      ],
      rating: [
        "rgba(239, 68, 68, 0.8)",   // 1 star - Red
        "rgba(251, 146, 60, 0.8)",  // 2 stars - Orange
        "rgba(234, 179, 8, 0.8)",   // 3 stars - Yellow
        "rgba(132, 204, 22, 0.8)",  // 4 stars - Lime
        "rgba(16, 185, 129, 0.8)",  // 5 stars - Green
      ],
    };

    const colors = questionType === 2 
      ? colorSchemes.rating 
      : colorSchemes.singleChoice;

    const backgroundColors = colors.slice(0, labels.length);
    const borderColors = backgroundColors.map((color) => color.replace("0.8", "1"));

    return {
      labels,
      datasets: [
        {
          label: "Votes",
          data: numericValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };
  };

  // Chart configuration options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            size: 12,
          },
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    scales: chartType === "bar" ? {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    } : undefined,
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-blue-50 border-2 border-primary rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-900 font-medium">{message}</p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <button
          onClick={onBack}
          className="mb-4 text-primary hover:text-primary-dark font-semibold flex items-center transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h2 className="text-3xl font-bold text-gray-900">Survey Results</h2>
        <p className="text-xl text-gray-600 mt-2">{surveyInfo.title}</p>
        {surveyInfo.category && (
          <p className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {surveyInfo.category}
            </span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <button
            onClick={handleDecryptAll}
            disabled={isDecrypting}
            className="btn-primary py-3 px-8"
          >
            {isDecrypting ? "Decrypting..." : "Decrypt All Question Results"}
          </button>

          {decryptedQuestionResults && decryptedQuestionResults.length > 0 && (
            <>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
                <span className="text-sm font-medium text-gray-700">Chart Type:</span>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartType === "bar"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  onClick={() => setChartType("pie")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartType === "pie"
                      ? "bg-primary text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Pie Chart
                </button>
              </div>

              <label className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto Refresh (30s)
                </span>
              </label>
            </>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Question Results Analysis
        </h3>

        {questionsMeta.length === 0 ? (
          <p className="text-gray-500">Loading questions...</p>
        ) : (
          <div className="space-y-8">
            {questionsMeta.map((q, idx) => {
              const handles = questionResultHandles?.[idx] || [];
              const values = decryptedQuestionResults?.[idx] || [];
              const isRating = q.type === 2;
              const isSingleChoice = q.type === 0;
              const isMultipleChoice = q.type === 1;
              
              const labels = isRating
                ? ["⭐ 1 Star", "⭐⭐ 2 Stars", "⭐⭐⭐ 3 Stars", "⭐⭐⭐⭐ 4 Stars", "⭐⭐⭐⭐⭐ 5 Stars"]
                : (q.options && q.options.length > 0 ? q.options : handles.map((_, i) => `Option ${i + 1}`));

              const totalVotes = values.reduce((sum, v) => sum + Number(v), 0);
              const chartData = values.length > 0 ? generateChartData(labels, values, q.type) : null;

              return (
                <div key={idx} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-bold text-gray-900 flex-1">
                        <span className="inline-block bg-primary text-white rounded-full w-7 h-7 text-center leading-7 text-sm mr-2">
                          {idx + 1}
                        </span>
                        {q.text}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isRating ? "bg-yellow-100 text-yellow-800" :
                        isSingleChoice ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      }`}>
                        {isRating ? "Rating" : isSingleChoice ? "Single Choice" : "Multiple Choice"}
                      </span>
                    </div>
                    {values.length > 0 && (
                      <p className="text-sm text-gray-600 ml-9">
                        Total Votes: <span className="font-semibold text-primary">{totalVotes}</span>
                      </p>
                    )}
                  </div>

                  {values.length > 0 ? (
                    <div className="space-y-4">
                      {/* Chart Display Area */}
                      {chartData && (
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                          <div className="max-w-2xl mx-auto" style={{ height: chartType === "pie" ? "400px" : "350px" }}>
                            {chartType === "bar" ? (
                              <Bar data={chartData} options={chartOptions} />
                            ) : (
                              <Pie data={chartData} options={chartOptions} />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Data Table Display */}
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Option
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Votes
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Percentage
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Progress Bar
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {labels.map((label, i) => {
                              const count = Number(values[i] ?? 0);
                              const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
                              const barWidth = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                              
                              return (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                    {label}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center bg-primary text-white font-bold text-sm px-3 py-1 rounded-full min-w-[3rem]">
                                      {count}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                                    {percentage}%
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                      <div
                                        className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${barWidth}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Statistical Summary (Average rating for rating questions only) */}
                      {isRating && totalVotes > 0 && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Average Rating:</span>
                            </div>
                            <span className="text-2xl font-bold text-yellow-600">
                              {(() => {
                                const weightedSum = values.reduce((sum, v, i) => sum + Number(v) * (i + 1), 0);
                                const average = weightedSum / totalVotes;
                                return average.toFixed(2);
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-gray-600 font-medium">Encrypted Data Ready</p>
                      <p className="text-sm text-gray-500 mt-1">Click "Decrypt All Question Results" button above to view data</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900">Total Responses</h3>
        </div>
        
        {totalResponsesHandle && totalResponsesHandle !== ethers.ZeroHash ? (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Encrypted Data Handle</p>
              <p className="text-sm font-mono text-gray-700 break-all">
                {totalResponsesHandle.substring(0, 40)}...
              </p>
            </div>
            {decryptedTotalResponses !== undefined ? (
              <div className="text-center py-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="text-6xl font-bold text-green-600 mb-2">
                  {decryptedTotalResponses.toString()}
                </div>
                <p className="text-gray-700 font-medium">Total Responses Received</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  Click the button below to decrypt and view the total number of responses
                </p>
                <button
                  onClick={handleDecrypt}
                  disabled={!canDecrypt || isDecrypting}
                  className="btn-secondary py-3 px-8"
                >
                  {isDecrypting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Decrypting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Decrypt Total Responses
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 font-medium">No responses yet</p>
            <p className="text-sm text-gray-400 mt-1">Responses will appear here once participants submit their answers</p>
          </div>
        )}
      </div>

      <div className="card p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">✨ Visualization Features</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Multiple chart types support (Bar chart, Pie chart)
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Real-time auto refresh (optional 30s auto-update)
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Detailed data table display (with percentage and progress bar)
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Automatic average rating calculation for rating questions
              </li>
              <li className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Responsive design, mobile-friendly
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Survey Information
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900">{surveyInfo.questionCount.toString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className={`text-2xl font-bold ${surveyInfo.isActive ? "text-green-600" : "text-gray-600"}`}>
              {surveyInfo.isActive ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Start Date</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(Number(surveyInfo.startTime) * 1000).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">End Date</p>
            <p className="text-sm font-semibold text-gray-900">
              {new Date(Number(surveyInfo.endTime) * 1000).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

