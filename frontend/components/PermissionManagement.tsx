"use client";

import { useState } from "react";
import { useEncryptedSurvey, SurveyInfo } from "@/hooks/useEncryptedSurvey";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

interface PermissionManagementProps {
  surveyId: bigint;
  surveyInfo: SurveyInfo;
  currentAccount?: string;
  onBack: () => void;
}

export const PermissionManagement = ({
  surveyId,
  surveyInfo,
  currentAccount,
  onBack,
}: PermissionManagementProps) => {
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

  const { grantPermission, revokePermission, message } = useEncryptedSurvey({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [viewerAddress, setViewerAddress] = useState("");
  const [canView, setCanView] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const isCreator =
    currentAccount?.toLowerCase() === surveyInfo.creator.toLowerCase();

  if (!isCreator) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600 mb-6">
          Only the survey creator can manage permissions and access control.
        </p>
        <button
          onClick={onBack}
          className="btn-primary"
        >
          Back to Surveys
        </button>
      </div>
    );
  }

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!viewerAddress.trim()) {
      alert("Please enter a viewer address");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(viewerAddress)) {
      alert("Invalid Ethereum address format");
      return;
    }

    await grantPermission(surveyId, viewerAddress, canView, canExport, canManage);
    setViewerAddress("");
  };

  const handleRevoke = async (address: string) => {
    if (!confirm(`Revoke all permissions for ${address}?`)) {
      return;
    }

    await revokePermission(surveyId, address);
  };

  return (
    <div className="space-y-6">
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
        <h2 className="text-3xl font-bold text-gray-900">Access Management</h2>
        <p className="text-xl text-gray-600 mt-2">{surveyInfo.title}</p>
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Grant Access Permissions
        </h3>
        
        <form onSubmit={handleGrant} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ethereum Address *
            </label>
            <input
              type="text"
              value={viewerAddress}
              onChange={(e) => setViewerAddress(e.target.value)}
              placeholder="0x..."
              className="input-field"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter the Ethereum address of the user you want to grant permissions to</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Select Permissions</p>
            <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors duration-200">
              <input
                type="checkbox"
                checked={canView}
                onChange={(e) => setCanView(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary mt-0.5 mr-3"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Can View Results</span>
                <p className="text-xs text-gray-600">Allows user to decrypt and view survey results</p>
              </div>
            </label>
            <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors duration-200">
              <input
                type="checkbox"
                checked={canExport}
                onChange={(e) => setCanExport(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary mt-0.5 mr-3"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Can Export Results</span>
                <p className="text-xs text-gray-600">Allows user to export survey data for analysis</p>
              </div>
            </label>
            <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors duration-200">
              <input
                type="checkbox"
                checked={canManage}
                onChange={(e) => setCanManage(e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary mt-0.5 mr-3"
              />
              <div>
                <span className="text-sm font-semibold text-gray-900">Can Manage Survey</span>
                <p className="text-xs text-gray-600">Allows user to modify survey settings and status</p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3"
          >
            Grant Permissions
          </button>
        </form>
      </div>

      {message && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-900 font-medium">{message}</p>
          </div>
        </div>
      )}

      <div className="card p-6 bg-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Permission Types Explained
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p className="text-gray-800">
              <strong className="font-semibold">View Results:</strong> Grants access to decrypt and view encrypted survey responses
            </p>
          </div>
          <div className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p className="text-gray-800">
              <strong className="font-semibold">Export Results:</strong> Enables exporting survey data in various formats for external analysis
            </p>
          </div>
          <div className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p className="text-gray-800">
              <strong className="font-semibold">Manage Survey:</strong> Provides full control to modify survey settings, duration, and operational status
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

