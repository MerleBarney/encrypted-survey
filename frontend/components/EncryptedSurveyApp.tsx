"use client";

import { useState, useEffect, useRef } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useEncryptedSurvey, SurveyInfo } from "../hooks/useEncryptedSurvey";
import { SurveyCreation } from "./SurveyCreation";
import { SurveyList } from "./SurveyList";
import { SurveyParticipation } from "./SurveyParticipation";
import { SurveyResults } from "./SurveyResults";
import { PermissionManagement } from "./PermissionManagement";

type View = "list" | "create" | "participate" | "results" | "permissions";

export const EncryptedSurveyApp = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const surveyHook = useEncryptedSurvey({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const previousAccountRef = useRef<string | undefined>(undefined);

  // Monitor account changes and show alert
  useEffect(() => {
    const currentAccount = accounts?.[0];
    
    // Only show alert if account actually changed (not on initial load)
    if (previousAccountRef.current !== undefined && 
        currentAccount && 
        previousAccountRef.current !== currentAccount) {
      alert(`Account switched successfully!\n\nNew account address:\n${currentAccount}`);
    }
    
    // Update the previous account reference
    previousAccountRef.current = currentAccount;
  }, [accounts]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Encrypted Survey Platform
            </h1>
            <p className="text-xl text-gray-600">
              Privacy-Preserving Surveys with Fully Homomorphic Encryption
            </p>
          </div>
          <button
            onClick={connect}
            disabled={isConnected}
            className="btn-primary text-lg py-4 px-8 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Connect Wallet to Get Started
          </button>
          <p className="mt-6 text-sm text-gray-500">
            Connect your MetaMask wallet to create and participate in secure surveys
          </p>
        </div>
      </div>
    );
  }

  if (surveyHook.isDeployed === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="card p-8 max-w-2xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Contract Not Deployed
          </h2>
          <p className="text-gray-600 mb-2">
            The EncryptedSurvey contract is not deployed on this network (Chain ID: {chainId}).
          </p>
          <p className="text-sm text-gray-500">
            Please deploy the contract first or switch to a supported network.
          </p>
        </div>
      </div>
    );
  }

  const handleSelectSurvey = (surveyId: bigint) => {
    const survey = surveyHook.surveys.find((s) => s.surveyId === surveyId);
    if (survey) {
      setSelectedSurvey(survey);
      setCurrentView("participate");
    }
  };

  const handleViewResults = (survey: SurveyInfo) => {
    setSelectedSurvey(survey);
    setCurrentView("results");
  };

  const handleManagePermissions = (survey: SurveyInfo) => {
    setSelectedSurvey(survey);
    setCurrentView("permissions");
  };

  const handleRefreshSurveys = async () => {
    setIsRefreshing(true);
    try {
      await surveyHook.loadSurveys();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-light shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Encrypted Survey Platform
              </h1>
              <p className="text-blue-100 mt-1">
                Privacy-Preserving Surveys with FHE
              </p>
            </div>
            <div className="text-right text-white">
              <div className="text-sm opacity-90">Connected Account</div>
              <div className="font-mono text-base font-semibold">
                {accounts?.[0]?.substring(0, 6)}...{accounts?.[0]?.substring(38)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-50 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-4">
            <button
              onClick={() => {
                setCurrentView("list");
                setSelectedSurvey(null);
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                currentView === "list"
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200"
              }`}
            >
              Browse Surveys
            </button>
            <button
              onClick={() => setCurrentView("create")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                currentView === "create"
                  ? "bg-secondary text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200"
              }`}
            >
              Create New Survey
            </button>
          </div>
        </div>
      </nav>

      {/* Info Bar */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <span className="text-gray-600">Network:</span>
                <span className="ml-2 font-semibold text-gray-900">Chain {chainId}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">FHEVM:</span>
                <span className={`ml-2 font-semibold ${fhevmInstance ? "text-green-600" : "text-orange-600"}`}>
                  {fhevmInstance ? "✓ Ready" : "⟳ Initializing"}
                </span>
              </div>
            </div>
            <div className="text-gray-600">
              {surveyHook.surveys.length} {surveyHook.surveys.length === 1 ? "survey" : "surveys"} available
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "list" && (
          <SurveyList
            surveys={surveyHook.surveys}
            onSelectSurvey={handleSelectSurvey}
            onViewResults={handleViewResults}
            onManagePermissions={handleManagePermissions}
            currentAccount={accounts?.[0]}
            onRefresh={handleRefreshSurveys}
            isRefreshing={isRefreshing}
          />
        )}

        {currentView === "create" && (
          <SurveyCreation />
        )}

        {currentView === "participate" && selectedSurvey && (
          <SurveyParticipation
            surveyId={selectedSurvey.surveyId}
            surveyInfo={selectedSurvey}
            onBack={() => {
              setCurrentView("list");
              setSelectedSurvey(null);
            }}
          />
        )}

        {currentView === "results" && selectedSurvey && (
          <SurveyResults
            surveyId={selectedSurvey.surveyId}
            surveyInfo={selectedSurvey}
            onBack={() => {
              setCurrentView("list");
              setSelectedSurvey(null);
            }}
          />
        )}

        {currentView === "permissions" && selectedSurvey && (
          <PermissionManagement
            surveyId={selectedSurvey.surveyId}
            surveyInfo={selectedSurvey}
            currentAccount={accounts?.[0]}
            onBack={() => {
              setCurrentView("list");
              setSelectedSurvey(null);
            }}
          />
        )}
      </main>

      {/* Status Message */}
      {surveyHook.message && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <div className="bg-white border-2 border-primary shadow-lg rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {surveyHook.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
