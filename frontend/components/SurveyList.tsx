"use client";

import { useState, useEffect, useRef } from "react";
import { SurveyInfo, useEncryptedSurvey } from "@/hooks/useEncryptedSurvey";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { ethers } from "ethers";
import { EncryptedSurveyABI } from "@/abi/EncryptedSurveyABI";

interface SurveyListProps {
  surveys: SurveyInfo[];
  onSelectSurvey: (surveyId: bigint) => void;
  onViewResults?: (survey: SurveyInfo) => void;
  onManagePermissions?: (survey: SurveyInfo) => void;
  currentAccount?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SurveyList = ({ 
  surveys, 
  onSelectSurvey, 
  onViewResults,
  onManagePermissions,
  currentAccount,
  onRefresh,
  isRefreshing = false
}: SurveyListProps) => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    ethersReadonlyProvider,
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

  const sameChainRef = useRef(() => true);
  const sameSignerRef = useRef(() => true);

  const { contractAddress } = useEncryptedSurvey({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner: undefined,
    ethersReadonlyProvider,
    sameChain: sameChainRef,
    sameSigner: sameSignerRef,
  });

  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());

  // Check permissions for all surveys
  useEffect(() => {
    if (!contractAddress || !ethersReadonlyProvider || !currentAccount || surveys.length === 0) {
      return;
    }

    const checkPermissions = async () => {
      const contract = new ethers.Contract(
        contractAddress,
        EncryptedSurveyABI.abi,
        ethersReadonlyProvider
      );

      const newPermissions = new Map<string, boolean>();

      for (const survey of surveys) {
        const isCreator = survey.creator.toLowerCase() === currentAccount.toLowerCase();
        if (isCreator) {
          // Creator always has permission
          newPermissions.set(survey.surveyId.toString(), true);
        } else {
          // Check permission for non-creators
          try {
            const [canView] = await contract.getPermission(survey.surveyId, currentAccount);
            newPermissions.set(survey.surveyId.toString(), canView);
          } catch (e) {
            // If permission check fails, assume no permission
            newPermissions.set(survey.surveyId.toString(), false);
          }
        }
      }

      setPermissions(newPermissions);
    };

    checkPermissions();
  }, [contractAddress, ethersReadonlyProvider, currentAccount, surveys]);

  const hasPermission = (survey: SurveyInfo): boolean => {
    if (survey.creator.toLowerCase() === currentAccount?.toLowerCase()) {
      return true; // Creator always has permission
    }
    return permissions.get(survey.surveyId.toString()) ?? false;
  };
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const isActive = (survey: SurveyInfo) => {
    const now = Math.floor(Date.now() / 1000);
    return (
      survey.isActive &&
      Number(survey.startTime) <= now &&
      Number(survey.endTime) >= now
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Available Surveys</h2>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">{surveys.length} {surveys.length === 1 ? "survey" : "surveys"}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh surveys list"
            >
              <svg 
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Surveys Available</h3>
          <p className="text-gray-600 mb-6">Be the first to create a survey and start gathering insights!</p>
          <button
            onClick={() => {/* Navigate handled by parent */}}
            className="btn-secondary"
          >
            Create Your First Survey
          </button>
        </div>
      ) : (
      
      <div className="grid gap-4">
        {surveys.map((survey) => (
          <div
            key={survey.surveyId.toString()}
            className="card p-6 hover:border-primary transition-all duration-200 cursor-pointer"
            onClick={() => onSelectSurvey(survey.surveyId)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h3>
                {survey.category && (
                  <p className="text-gray-600">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {survey.category}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end ml-4">
                {isActive(survey) ? (
                  <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Active
                  </span>
                ) : (
                  <span className="px-4 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                    Inactive
                  </span>
                )}
                {survey.creator.toLowerCase() === currentAccount?.toLowerCase() && (
                  <span className="px-4 py-1 bg-primary-light text-white rounded-full text-sm font-semibold">
                    Your Survey
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 mb-4 bg-gray-50 rounded-lg px-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{survey.questionCount.toString()}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="text-center border-l-2 border-gray-200">
                <div className="text-sm text-gray-600">Start Date</div>
                <div className="text-sm font-semibold text-gray-900">{formatDate(survey.startTime)}</div>
              </div>
              <div className="text-center border-l-2 border-gray-200">
                <div className="text-sm text-gray-600">End Date</div>
                <div className="text-sm font-semibold text-gray-900">{formatDate(survey.endTime)}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
              <button
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  isActive(survey)
                    ? "btn-primary"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSurvey(survey.surveyId);
                }}
              >
                {isActive(survey) ? "Participate Now" : "View Details"}
              </button>
              {onViewResults && hasPermission(survey) && (
                <button
                  className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewResults(survey);
                  }}
                >
                  View Results
                </button>
              )}
              {onManagePermissions && 
               survey.creator.toLowerCase() === currentAccount?.toLowerCase() && (
                <button
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManagePermissions(survey);
                  }}
                >
                  Manage Access
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

