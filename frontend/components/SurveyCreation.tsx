"use client";

import { useState } from "react";
import { useEncryptedSurvey, Question, QuestionType } from "@/hooks/useEncryptedSurvey";
import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export const SurveyCreation = () => {
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

  const { createSurvey, isCreating, canCreateSurvey, message } = useEncryptedSurvey({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", type: 0, options: [""] },
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: 0, options: [""] }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    if (field === "options") {
      updated[index] = { ...updated[index], options: value };
    } else if (field === "type") {
      // When changing to rating type (2), clear options as they're not needed
      // When changing from rating type, ensure at least one empty option exists
      if (value === 2) {
        updated[index] = { ...updated[index], type: value, options: [] };
      } else {
        // For other types, ensure at least one option exists
        if (updated[index].options.length === 0) {
          updated[index] = { ...updated[index], type: value, options: [""] };
        } else {
          updated[index] = { ...updated[index], type: value };
        }
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setQuestions(updated);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateSurvey) {
      alert("Cannot create survey. Please check your connection.");
      return;
    }

    // Validate
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        alert(`Question ${i + 1} text is required`);
        return;
      }
      // Rating questions (type 2) don't need options - they use a fixed 1-5 scale
      if (q.type !== 2) {
        if (q.options.length === 0 || q.options.some((opt) => !opt.trim())) {
          alert(`Question ${i + 1} must have at least one option`);
          return;
        }
      }
    }

    const startTimestamp = BigInt(Math.floor(new Date(startTime).getTime() / 1000));
    const endTimestamp = BigInt(Math.floor(new Date(endTime).getTime() / 1000));
    const tagsArray = tags.split(",").map((t) => t.trim()).filter((t) => t);

    // Prepare questions for submission
    // Rating questions need at least one option for the contract, so we add default options
    const preparedQuestions = questions.map((q) => {
      if (q.type === 2 && q.options.length === 0) {
        // Rating questions: add 5 default options (1-5 stars)
        return { ...q, options: ["1", "2", "3", "4", "5"] };
      }
      return q;
    });

    await createSurvey(
      title,
      category,
      tagsArray,
      startTimestamp,
      endTimestamp,
      preparedQuestions
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Create New Survey</h2>
          <p className="text-gray-600 mt-2">Design your encrypted survey with privacy-preserving technology</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Basic Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Survey Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Enter a clear and descriptive title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
                placeholder="e.g., Market Research, User Feedback, Product Development"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="input-field"
                placeholder="e.g., feedback, product, satisfaction"
              />
              <p className="text-xs text-gray-500 mt-1">Add tags to help organize and search for your survey</p>
            </div>
          </div>
        </div>

        {/* Time Settings */}
        <div className="card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Survey Duration
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Questions *
            </h3>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>

          {questions.map((question, qIndex) => (
            <div
              key={qIndex}
              className="mb-4 p-5 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-primary transition-colors duration-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Question {qIndex + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors duration-200 font-medium"
                >
                  Remove
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question Text *
                </label>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) =>
                    updateQuestion(qIndex, "text", e.target.value)
                  }
                  className="input-field bg-white"
                  placeholder="Enter your question here"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Question Type *
                </label>
                <select
                  value={question.type}
                  onChange={(e) =>
                    updateQuestion(qIndex, "type", Number(e.target.value) as QuestionType)
                  }
                  className="input-field bg-white"
                >
                  <option value={0}>Single Choice (Select One)</option>
                  <option value={1}>Multiple Choice (Select Many)</option>
                  <option value={2}>Rating Scale (1-5 Stars)</option>
                </select>
              </div>

              {question.type !== 2 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Options *</label>
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="text-sm text-primary hover:text-primary-dark font-semibold flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, e.target.value)
                          }
                          className="input-field bg-white flex-1"
                          placeholder={`Option ${oIndex + 1}`}
                          required
                        />
                        {question.options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(qIndex, oIndex)}
                            className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.type === 2 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Rating questions automatically use a 1-5 star scale
                  </p>
                </div>
              )}
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          )}
        </div>

        {message && (
          <div className="bg-blue-50 border-2 border-primary rounded-lg p-4">
            <p className="text-gray-900 font-medium">{message}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!canCreateSurvey || isCreating}
            className="btn-primary flex-1 py-3 text-lg"
          >
            {isCreating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Survey...
              </span>
            ) : (
              "Create Survey"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

