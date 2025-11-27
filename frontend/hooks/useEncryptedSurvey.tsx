"use client";

/**
 * useEncryptedSurvey
 * High-level hook encapsulating survey creation, encrypted submission,
 * results loading, and user-side decryption flows on FHEVM contracts.
 * Returns helpers and UI-friendly state flags/messages.
 */
import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { EncryptedSurveyAddresses } from "@/abi/EncryptedSurveyAddresses";
import { EncryptedSurveyABI } from "@/abi/EncryptedSurveyABI";
import { Interface } from "ethers";

type EncryptedSurveyInfoType = {
  abi: typeof EncryptedSurveyABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getEncryptedSurveyByChainId(
  chainId: number | undefined
): EncryptedSurveyInfoType {
  if (!chainId) {
    return { abi: EncryptedSurveyABI.abi };
  }

  const entry =
    EncryptedSurveyAddresses[chainId.toString() as keyof typeof EncryptedSurveyAddresses];

  if (!entry || !entry.address || entry.address === ethers.ZeroAddress) {
    return { abi: EncryptedSurveyABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: EncryptedSurveyABI.abi,
  };
}

export type QuestionType = 0 | 1 | 2; // SingleChoice, MultipleChoice, Rating

export type Question = {
  text: string;
  type: QuestionType;
  options: string[];
};

export type SurveyInfo = {
  surveyId: bigint;
  creator: string;
  title: string;
  category: string;
  createdAt: bigint;
  startTime: bigint;
  endTime: bigint;
  questionCount: bigint;
  exists: boolean;
  isActive: boolean;
};

export const useEncryptedSurvey = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}): ReturnType<typeof useEncryptedSurveyInternal> => {
  return useEncryptedSurveyInternal(parameters);
};

const useEncryptedSurveyInternal = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [surveys, setSurveys] = useState<SurveyInfo[]>([]);
  const [totalResponsesHandle, setTotalResponsesHandle] = useState<string | undefined>(undefined);
  const [decryptedTotalResponses, setDecryptedTotalResponses] = useState<bigint | undefined>(undefined);
  const [questionResultHandles, setQuestionResultHandles] = useState<string[][]>([]);
  const [decryptedQuestionResults, setDecryptedQuestionResults] = useState<bigint[][]>([]);

  const contractRef = useRef<EncryptedSurveyInfoType | undefined>(undefined);
  const isCreatingRef = useRef<boolean>(isCreating);
  const isSubmittingRef = useRef<boolean>(isSubmitting);
  const isDecryptingRef = useRef<boolean>(isDecrypting);

  useEffect(() => {
    isCreatingRef.current = isCreating;
  }, [isCreating]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    isDecryptingRef.current = isDecrypting;
  }, [isDecrypting]);

  const contract = useMemo(() => {
    const c = getEncryptedSurveyByChainId(chainId);
    contractRef.current = c;
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!contract) {
      return undefined;
    }
    return Boolean(contract.address) && contract.address !== ethers.ZeroAddress;
  }, [contract]);

  const canCreateSurvey = useMemo(() => {
    return (
      contract.address &&
      instance &&
      ethersSigner &&
      !isCreating
    );
  }, [contract.address, instance, ethersSigner, isCreating]);

  const canSubmitResponse = useMemo(() => {
    return (
      contract.address &&
      instance &&
      ethersSigner &&
      !isSubmitting
    );
  }, [contract.address, instance, ethersSigner, isSubmitting]);

  const canDecrypt = useMemo(() => {
    return (
      contract.address &&
      instance &&
      ethersSigner &&
      !isDecrypting &&
      totalResponsesHandle &&
      totalResponsesHandle !== ethers.ZeroHash
    );
  }, [contract.address, instance, ethersSigner, isDecrypting, totalResponsesHandle]);

  const createSurvey = useCallback(
    async (
      title: string,
      category: string,
      tags: string[],
      startTime: bigint,
      endTime: bigint,
      questions: Question[]
    ) => {
      if (isCreatingRef.current) {
        return;
      }

      if (!contract.address || !instance || !ethersSigner) {
        setMessage("Contract not available");
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = contract.address;
      const thisEthersSigner = ethersSigner;
      const thisContract = new ethers.Contract(
        thisContractAddress,
        contract.abi,
        thisEthersSigner
      );

      isCreatingRef.current = true;
      setIsCreating(true);
      setMessage("Creating survey...");

      try {
        const questionTexts = questions.map((q) => q.text);
        const questionTypes = questions.map((q) => q.type);
        const questionOptions = questions.map((q) => q.options);

        // For now, we don't need encrypted weights for questions
        // If needed in the future, we can add them here

        const tx: ethers.TransactionResponse = await thisContract.createSurvey(
          title,
          category,
          tags,
          startTime,
          endTime,
          questionTexts,
          questionTypes,
          questionOptions
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        // Extract survey ID from event
        let surveyId = "unknown";
        if (receipt?.logs && receipt.logs.length > 0) {
          try {
            const iface = new Interface(contract.abi);
            for (const log of receipt.logs) {
              try {
                const parsed = iface.parseLog(log);
                if (parsed && parsed.name === "SurveyCreated") {
                  surveyId = parsed.args[0].toString();
                  break;
                }
              } catch (e) {
                // Not the event we're looking for
              }
            }
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        }

        // Automatically grant permission to creator
        if (surveyId !== "unknown") {
          try {
            setMessage("Granting permission to creator...");
            const creatorAddress = await thisEthersSigner.getAddress();
            const grantTx = await thisContract.grantPermission(
              BigInt(surveyId),
              creatorAddress,
              true, // canView
              true, // canExport
              true  // canManage
            );
            await grantTx.wait();
            setMessage(`Survey created! Survey ID: ${surveyId}. Permission granted to creator.`);
          } catch (e: any) {
            console.error("Failed to grant permission to creator:", e);
            setMessage(`Survey created! Survey ID: ${surveyId}. Note: Permission grant failed, you may need to grant permission manually.`);
          }
        } else {
          setMessage(`Survey created! Survey ID: ${surveyId}`);
        }

        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === contractRef.current?.address
        ) {
          // Refresh surveys list
          await loadSurveys();
        }
      } catch (e: any) {
        setMessage(`Failed to create survey: ${e.message || e}`);
        console.error(e);
      } finally {
        isCreatingRef.current = false;
        setIsCreating(false);
      }
    },
    [
      ethersSigner,
      contract.address,
      contract.abi,
      instance,
      chainId,
      sameChain,
    ]
  );

  const submitResponse = useCallback(
    async (surveyId: bigint, answers: number[]) => {
      if (isSubmittingRef.current) {
        return;
      }

      if (!contract.address || !instance || !ethersSigner) {
        setMessage("Contract not available");
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = contract.address;
      const thisEthersSigner = ethersSigner;
      const thisContract = new ethers.Contract(
        thisContractAddress,
        contract.abi,
        thisEthersSigner
      );

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting answers...");

      try {
        // Get survey info to know question count
        const surveyInfo = await thisContract.getSurveyInfo(surveyId);
        const questionCount = Number(surveyInfo.questionCount);

        if (answers.length !== questionCount) {
          throw new Error(`Expected ${questionCount} answers, got ${answers.length}`);
        }

        // Encrypt each answer
        const encryptedAnswers: any[] = [];
        const answerProofs: string[] = [];

        for (let i = 0; i < answers.length; i++) {
          const input = instance.createEncryptedInput(
            thisContractAddress,
            thisEthersSigner.address
          );
          input.add32(answers[i]);

          const enc = await input.encrypt();
          encryptedAnswers.push(enc.handles[0]);
          answerProofs.push(ethers.hexlify(enc.inputProof));
        }

        setMessage("Submitting encrypted response...");

        const tx: ethers.TransactionResponse = await thisContract.submitResponse(
          surveyId,
          encryptedAnswers,
          answerProofs
        );

        setMessage(`Waiting for tx: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage("Response submitted successfully!");

        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === contractRef.current?.address
        ) {
          // Refresh total responses
          await loadTotalResponses(surveyId);
        }
      } catch (e: any) {
        setMessage(`Failed to submit response: ${e.message || e}`);
        console.error(e);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [
      ethersSigner,
      contract.address,
      contract.abi,
      instance,
      chainId,
      sameChain,
    ]
  );

  const loadSurveys = useCallback(async () => {
    if (!contract.address || !ethersReadonlyProvider) {
      return;
    }

    try {
      const thisContract = new ethers.Contract(
        contract.address,
        contract.abi,
        ethersReadonlyProvider
      );

      const surveyCounter = await thisContract.surveyCounter();
      const surveyCount = Number(surveyCounter);

      const surveysList: SurveyInfo[] = [];

      for (let i = 0; i < surveyCount; i++) {
        try {
          const info = await thisContract.getSurveyInfo(i);
          surveysList.push({
            surveyId: BigInt(i),
            creator: info.creator,
            title: info.title,
            category: info.category,
            createdAt: BigInt(info.createdAt),
            startTime: BigInt(info.startTime),
            endTime: BigInt(info.endTime),
            questionCount: BigInt(info.questionCount),
            exists: info.exists,
            isActive: info.isActive,
          });
        } catch (e) {
          // Survey doesn't exist, skip
          console.log(`Survey ${i} doesn't exist`);
        }
      }

      // Sort surveys by creation time (newest first)
      surveysList.sort((a, b) => {
        const aTime = Number(a.createdAt);
        const bTime = Number(b.createdAt);
        return bTime - aTime; // Descending order (newest first)
      });

      setSurveys(surveysList);
    } catch (e: any) {
      console.error("Failed to load surveys:", e);
    }
  }, [contract.address, contract.abi, ethersReadonlyProvider]);

  const loadAllQuestionResults = useCallback(
    async (surveyId: bigint) => {
      if (!contract.address || !ethersReadonlyProvider) {
        return;
      }

      try {
        const thisContract = new ethers.Contract(
          contract.address,
          contract.abi,
          ethersReadonlyProvider
        );

        const info = await thisContract.getSurveyInfo(surveyId);
        const count = Number(info.questionCount);
        const handles: string[][] = [];

        for (let q = 0; q < count; q++) {
          const qInfo = await thisContract.getQuestionInfo(surveyId, q);
          const qType: number = Number(qInfo.qType);
          const expectedLen = qType === 2 ? 5 : Number(qInfo.optionCount);
          const arr = await thisContract.getQuestionOptionCounts(surveyId, q);
          const arrHandles: string[] = Array.from(arr as string[]);
          // Ensure consistent length if empty/uninitialized
          if (arrHandles.length < expectedLen) {
            const padded = [...arrHandles];
            for (let i = arrHandles.length; i < expectedLen; i++) {
              padded.push(ethers.ZeroHash);
            }
            handles.push(padded);
          } else {
            handles.push(arrHandles.slice(0, expectedLen));
          }
        }

        setQuestionResultHandles(handles);
      } catch (e: any) {
        console.error("Failed to load question results handles:", e);
      }
    },
    [contract.address, contract.abi, ethersReadonlyProvider]
  );

  const loadTotalResponses = useCallback(
    async (surveyId: bigint) => {
      if (!contract.address || !ethersReadonlyProvider) {
        return;
      }

      try {
        const thisContract = new ethers.Contract(
          contract.address,
          contract.abi,
          ethersReadonlyProvider
        );

        const handle = await thisContract.getTotalResponses(surveyId);
        setTotalResponsesHandle(handle);
      } catch (e: any) {
        console.error("Failed to load total responses:", e);
      }
    },
    [contract.address, contract.abi, ethersReadonlyProvider]
  );

  const decryptTotalResponses = useCallback(
    async (surveyId: bigint) => {
      if (isDecryptingRef.current) {
        return;
      }

      if (!contract.address || !instance || !ethersSigner || !totalResponsesHandle) {
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = contract.address;
      const thisTotalResponsesHandle = totalResponsesHandle;
      const thisEthersSigner = ethersSigner;
      const thisContract = new ethers.Contract(
        thisContractAddress,
        contract.abi,
        thisEthersSigner
      );

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setMessage("Checking permissions...");

      try {
        // Check if user has permission to decrypt
        const userAddress = await thisEthersSigner.getAddress();
        const [canView, canExport, canManage] = await thisContract.getPermission(surveyId, userAddress);
        
        // Get survey info to check if user is the creator
        const surveyInfo = await thisContract.getSurveyInfo(surveyId);
        const isCreator = surveyInfo.creator.toLowerCase() === userAddress.toLowerCase();

        // If user doesn't have permission
        if (!canView) {
          // If user is the creator, automatically grant permission
          if (isCreator) {
            setMessage("Granting permission to creator...");
            const grantTx = await thisContract.grantPermission(
              surveyId,
              userAddress,
              true, // canView
              true, // canExport
              true  // canManage
            );
            await grantTx.wait();
            setMessage("Permission granted! Decrypting total responses...");
          } else {
            setMessage("You don't have permission to decrypt this survey's results.");
            return;
          }
        } else {
          setMessage("Decrypting total responses...");
        }

        // Ensure ACL allows the current user to decrypt the current handle
        setMessage("Authorizing decryption for current user...");
        const authTx = await thisContract.authorizeMyDecryption(surveyId);
        await authTx.wait();

        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [contract.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [
            {
              handle: thisTotalResponsesHandle,
              contractAddress: thisContractAddress,
            },
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("Decryption completed!");

        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === contractRef.current?.address
        ) {
			const resMap = res as Record<string, unknown>;
			const value = resMap[thisTotalResponsesHandle];
          if (typeof value === "bigint") {
            setDecryptedTotalResponses(value);
          } else if (typeof value === "string") {
            setDecryptedTotalResponses(BigInt(value));
          } else {
            setDecryptedTotalResponses(undefined);
          }
        }
      } catch (e: any) {
        setMessage(`Decryption failed: ${e.message || e}`);
        console.error(e);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    },
    [
      fhevmDecryptionSignatureStorage,
      ethersSigner,
      contract.address,
      contract.abi,
      instance,
      totalResponsesHandle,
      chainId,
      sameChain,
    ]
  );

  const decryptAllQuestionResults = useCallback(
    async (surveyId: bigint) => {
      if (isDecryptingRef.current) {
        return;
      }

      if (!contract.address || !instance || !ethersSigner) {
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = contract.address;
      const thisEthersSigner = ethersSigner;
      const thisContract = new ethers.Contract(
        thisContractAddress,
        contract.abi,
        thisEthersSigner
      );

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setMessage("Preparing to decrypt all question results...");

      try {
        // Ensure permission
        const userAddress = await thisEthersSigner.getAddress();
        const [canView] = await thisContract.getPermission(surveyId, userAddress);
        const surveyInfo = await thisContract.getSurveyInfo(surveyId);
        const isCreator = surveyInfo.creator.toLowerCase() === userAddress.toLowerCase();
        if (!canView && isCreator) {
          setMessage("Granting permission to creator...");
          const grantTx = await thisContract.grantPermission(
            surveyId,
            userAddress,
            true,
            true,
            true
          );
          await grantTx.wait();
        } else if (!canView) {
          setMessage("You don't have permission to decrypt this survey's results.");
          return;
        }

        // Load handles if not loaded
        if (!questionResultHandles || questionResultHandles.length === 0) {
          await loadAllQuestionResults(surveyId);
        }

        // Authorize all current result handles for the caller
        setMessage("Authorizing all result handles for current user...");
        const authTx = await thisContract.authorizeAllResultsDecryption(surveyId);
        await authTx.wait();

        // Build signature
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [contract.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        // Build handle list
        const flatHandles: { handle: string; contractAddress: string }[] = [];
        for (const arr of questionResultHandles) {
          for (const h of arr) {
            if (h && h !== ethers.ZeroHash) {
              flatHandles.push({
                handle: h,
                contractAddress: thisContractAddress,
              });
            }
          }
        }

        if (flatHandles.length === 0) {
          setMessage("No results to decrypt yet.");
          return;
        }

        setMessage("Calling FHEVM userDecrypt for all results...");
		const res = await instance.userDecrypt(
          flatHandles,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        // Rebuild nested arrays
        const out: bigint[][] = [];
        let cursor = 0;
		const resMap = res as Record<string, unknown>;
        for (const arr of questionResultHandles) {
          const line: bigint[] = [];
          for (let i = 0; i < arr.length; i++) {
            const h = arr[i];
            if (!h || h === ethers.ZeroHash) {
              line.push(0n);
            } else {
					const value = resMap[h];
              if (typeof value === "bigint") {
                line.push(value);
              } else if (typeof value === "string") {
                line.push(BigInt(value));
              } else {
                line.push(0n);
              }
            }
            cursor++;
          }
          out.push(line);
        }

        if (sameChain.current(thisChainId) && thisContractAddress === contractRef.current?.address) {
          setDecryptedQuestionResults(out);
          setMessage("All question results decrypted.");
        }
      } catch (e: any) {
        setMessage(`Decryption failed: ${e.message || e}`);
        console.error(e);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    },
    [
      fhevmDecryptionSignatureStorage,
      ethersSigner,
      contract.address,
      contract.abi,
      instance,
      chainId,
      sameChain,
      questionResultHandles,
      loadAllQuestionResults,
    ]
  );

  const grantPermission = useCallback(
    async (
      surveyId: bigint,
      viewer: string,
      canView: boolean,
      canExport: boolean,
      canManage: boolean
    ) => {
      if (!contract.address || !ethersSigner) {
        return;
      }

      try {
        const thisContract = new ethers.Contract(
          contract.address,
          contract.abi,
          ethersSigner
        );

        const tx = await thisContract.grantPermission(
          surveyId,
          viewer,
          canView,
          canExport,
          canManage
        );

        await tx.wait();
        setMessage("Permission granted successfully!");
      } catch (e: any) {
        setMessage(`Failed to grant permission: ${e.message || e}`);
        console.error(e);
      }
    },
    [contract.address, contract.abi, ethersSigner]
  );

  const revokePermission = useCallback(
    async (surveyId: bigint, viewer: string) => {
      if (!contract.address || !ethersSigner) {
        return;
      }

      try {
        const thisContract = new ethers.Contract(
          contract.address,
          contract.abi,
          ethersSigner
        );

        const tx = await thisContract.revokePermission(surveyId, viewer);
        await tx.wait();
        setMessage("Permission revoked successfully!");
      } catch (e: any) {
        setMessage(`Failed to revoke permission: ${e.message || e}`);
        console.error(e);
      }
    },
    [contract.address, contract.abi, ethersSigner]
  );

  const getSurveyQuestions = useCallback(
    async (surveyId: bigint, questionIndex: number) => {
      if (!contract.address || !ethersReadonlyProvider) {
        return null;
      }

      try {
        const thisContract = new ethers.Contract(
          contract.address,
          contract.abi,
          ethersReadonlyProvider
        );

        const questionInfo = await thisContract.getQuestionInfo(
          surveyId,
          questionIndex
        );

        return {
          text: questionInfo.text,
          type: Number(questionInfo.qType) as QuestionType,
          optionCount: Number(questionInfo.optionCount),
          options: questionInfo.options,
        };
      } catch (e: any) {
        console.error("Failed to get question info:", e);
        return null;
      }
    },
    [contract.address, contract.abi, ethersReadonlyProvider]
  );

  useEffect(() => {
    if (contract.address && ethersReadonlyProvider) {
      loadSurveys();
    }
  }, [contract.address, ethersReadonlyProvider, loadSurveys]);

  return {
    contractAddress: contract.address,
    isDeployed,
    canCreateSurvey,
    canSubmitResponse,
    canDecrypt,
    createSurvey,
    submitResponse,
    loadSurveys,
    loadTotalResponses,
    decryptTotalResponses,
    loadAllQuestionResults,
    decryptAllQuestionResults,
    grantPermission,
    revokePermission,
    getSurveyQuestions,
    isCreating,
    isSubmitting,
    isDecrypting,
    message,
    surveys,
    totalResponsesHandle,
    decryptedTotalResponses,
    questionResultHandles,
    decryptedQuestionResults,
  };
};

