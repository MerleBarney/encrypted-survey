"use client";

import { useState, useEffect } from "react";
import { useEncryptedSurvey, SurveyInfo } from "@/hooks/useEncryptedSurvey";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

interface SurveyParticipationProps {
  surveyId: bigint;
  surveyInfo: SurveyInfo;
  onBack: () => void;
}

export const SurveyParticipation = ({
  surveyId,
  surveyInfo,
  onBack,
}: SurveyParticipationProps) => {
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

  const { getSurveyQuestions, submitResponse, isSubmitting, canSubmitResponse, message } =
    useEncryptedSurvey({
      instance: fhevmInstance,
      fhevmDecryptionSignatureStorage,
      eip1193Provider: provider,
      chainId,
      ethersSigner,
      ethersReadonlyProvider,
      sameChain,
      sameSigner,
    });

  const [questions, setQuestions] = useState<
    Array<{
      text: string;
      type: number;
      options: string[];
      answer: number | number[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      const loadedQuestions = [];
      for (let i = 0; i < Number(surveyInfo.questionCount); i++) {
        const q = await getSurveyQuestions(surveyId, i);
        if (q) {
          loadedQuestions.push({
            text: q.text,
            type: q.type,
            options: q.options,
            answer: q.type === 1 ? [] : q.type === 2 ? 3 : 0, // Default: multiple choice = [], rating = 3, single = 0
          });
        }
      }
      setQuestions(loadedQuestions);
      setLoading(false);
    };

    loadQuestions();
  }, [surveyId, surveyInfo.questionCount, getSurveyQuestions]);

  const updateAnswer = (questionIndex: number, value: number | number[]) => {
    const updated = [...questions];
    updated[questionIndex].answer = value;
    setQuestions(updated);
  };

  const toggleMultipleChoice = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    if (question.type !== 1) return;

    const currentAnswers = (question.answer as number[]) || [];
    const index = currentAnswers.indexOf(optionIndex);
    if (index > -1) {
      currentAnswers.splice(index, 1);
    } else {
      currentAnswers.push(optionIndex);
    }
    updateAnswer(questionIndex, currentAnswers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmitResponse) {
      alert("Cannot submit response. Please check your connection.");
      return;
    }

    // Convert answers to numbers
    const answers: number[] = questions.map((q) => {
      if (q.type === 1) {
        // Multiple choice: use bitmask
        const selected = q.answer as number[];
        return selected.reduce((acc, idx) => acc | (1 << idx), 0);
      } else if (q.type === 2) {
        // Rating: use the rating value
        return q.answer as number;
      } else {
        // Single choice: use the selected index
        return q.answer as number;
      }
    });

    await submitResponse(surveyId, answers);
  };

  const isActive = () => {
    const now = Math.floor(Date.now() / 1000);
    return (
      surveyInfo.isActive &&
      Number(surveyInfo.startTime) <= now &&
      Number(surveyInfo.endTime) >= now
    );
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-gray-700 font-medium">Loading survey questions...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we prepare the survey for you</p>
      </div>
    );
  }

  if (!isActive()) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Survey Not Active</h3>
        <p className="text-gray-600 mb-6">
          This survey is not currently accepting responses. Please check back during the active period.
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
          Back to Surveys
        </button>
        <h2 className="text-3xl font-bold text-gray-900">{surveyInfo.title}</h2>
        {surveyInfo.category && (
          <p className="text-gray-600 mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {surveyInfo.category}
            </span>
          </p>
        )}
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <strong className="mr-1">Privacy Protected:</strong> Your responses are encrypted using FHE technology
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((question, qIndex) => (
          <div
            key={qIndex}
            className="card p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Question {qIndex + 1}: {question.text}
            </h3>

            {question.type === 0 && (
              <div className="space-y-2">
                {question.options.map((option, oIndex) => (
                  <label
                    key={oIndex}
                    className="flex items-center p-3 border-2 border-gray-200 hover:border-primary hover:bg-blue-50 rounded-lg cursor-pointer transition-all duration-200"
                  >
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      value={oIndex}
                      checked={(question.answer as number) === oIndex}
                      onChange={() => updateAnswer(qIndex, oIndex)}
                      className="w-4 h-4 text-primary focus:ring-primary mr-3"
                      required
                    />
                    <span className="text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 1 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                {question.options.map((option, oIndex) => {
                  const selected = (question.answer as number[]).includes(oIndex);
                  return (
                    <label
                      key={oIndex}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selected
                          ? "border-primary bg-blue-50"
                          : "border-gray-200 hover:border-primary hover:bg-blue-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMultipleChoice(qIndex, oIndex)}
                        className="w-4 h-4 text-primary focus:ring-primary mr-3"
                      />
                      <span className="text-gray-800">{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {question.type === 2 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Rate from 1 to 5 stars</p>
                <div className="flex justify-between max-w-md">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label
                      key={rating}
                      className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 flex-1 mx-1 ${
                        (question.answer as number) === rating
                          ? "border-secondary bg-orange-50"
                          : "border-gray-200 hover:border-secondary hover:bg-orange-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={rating}
                        checked={(question.answer as number) === rating}
                        onChange={() => updateAnswer(qIndex, rating)}
                        className="sr-only"
                        required
                      />
                      <svg className={`w-8 h-8 mb-1 ${(question.answer as number) === rating ? "text-secondary" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700">{rating}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {message && (
          <div className="bg-blue-50 border-2 border-primary rounded-lg p-4">
            <p className="text-gray-900 font-medium">{message}</p>
          </div>
        )}

        <div className="card p-6">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmitResponse || isSubmitting}
              className="btn-primary flex-1 py-3"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Response...
                </span>
              ) : (
                "Submit Response"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

