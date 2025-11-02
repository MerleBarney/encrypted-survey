// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedSurvey - Privacy-preserving survey system using FHEVM
/// @notice A survey platform where all answers are encrypted and computed on encrypted data
/// @dev All survey responses are encrypted and statistics are computed on encrypted data
contract EncryptedSurvey is SepoliaConfig {
    // Survey structure
    struct Survey {
        address creator;
        string title;
        string category;
        string[] tags;
        uint256 createdAt;
        uint256 startTime;
        uint256 endTime;
        bool exists;
        bool isActive;
        uint256 questionCount;
        mapping(uint256 => Question) questions;
        // Deprecated: optionVotes (kept for backward compatibility, unused)
        mapping(uint256 => euint32) optionVotes;
        // Aggregated encrypted counts per question and per option (or rating bucket)
        // For SingleChoice/MultipleChoice: option index in [0, optionCount-1]
        // For Rating: bucket index in [0..4] corresponding to ratings [1..5]
        mapping(uint256 => mapping(uint256 => euint32)) aggregatedCounts;
        euint32 totalResponses; // Encrypted total number of responses
    }

    // Question structure
    struct Question {
        string text;
        QuestionType qType;
        uint256 optionCount;
        string[] options;
    }

    // Response structure
    struct Response {
        mapping(uint256 => euint32) encryptedAnswers; // Encrypted answers for each question
        bool exists;
        uint256 submittedAt;
    }

    // Permission structure
    struct Permission {
        bool canView; // Can decrypt and view results
        bool canExport; // Can export results
        bool canManage; // Can manage survey settings
        bool exists;
    }

    enum QuestionType {
        SingleChoice, // Radio button
        MultipleChoice, // Checkbox
        Rating // 1-5 rating scale
    }

    // Mapping from surveyId to Survey
    mapping(uint256 => Survey) public surveys;
    
    // Mapping from surveyId => userAddress => Response
    mapping(uint256 => mapping(address => Response)) public responses;
    
    // Mapping from surveyId => userAddress => Permission
    mapping(uint256 => mapping(address => Permission)) public permissions;
    
    // Survey counter
    uint256 public surveyCounter;

    // Events
    event SurveyCreated(
        uint256 indexed surveyId,
        address indexed creator,
        string title,
        string category,
        uint256 questionCount
    );
    event ResponseSubmitted(
        uint256 indexed surveyId,
        address indexed participant
    );
    event PermissionGranted(
        uint256 indexed surveyId,
        address indexed viewer,
        address indexed granter
    );
    event PermissionRevoked(
        uint256 indexed surveyId,
        address indexed viewer,
        address indexed revoker
    );
    event SurveyStatusChanged(
        uint256 indexed surveyId,
        bool isActive
    );

    /// @notice Create a new survey
    /// @param title Survey title
    /// @param category Survey category
    /// @param tags Survey tags
    /// @param startTime Start timestamp for survey period
    /// @param endTime End timestamp for survey period
    /// @param questionTexts Array of question texts
    /// @param questionTypes Array of question types
    /// @param questionOptions Array of arrays of option texts for each question
    /// @return surveyId The ID of the created survey
    function createSurvey(
        string memory title,
        string memory category,
        string[] memory tags,
        uint256 startTime,
        uint256 endTime,
        string[] memory questionTexts,
        QuestionType[] memory questionTypes,
        string[][] memory questionOptions
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(endTime > startTime, "Invalid time range");
        require(questionTexts.length > 0 && questionTexts.length <= 20, "Invalid question count");
        require(questionTexts.length == questionTypes.length, "Question texts and types length mismatch");
        require(questionTexts.length == questionOptions.length, "Question texts and options length mismatch");

        uint256 surveyId = surveyCounter++;
        Survey storage survey = surveys[surveyId];
        survey.creator = msg.sender;
        survey.title = title;
        survey.category = category;
        survey.tags = tags;
        survey.createdAt = block.timestamp;
        survey.startTime = startTime;
        survey.endTime = endTime;
        survey.exists = true;
        survey.isActive = true;
        survey.questionCount = questionTexts.length;

        // Initialize questions
        for (uint256 i = 0; i < questionTexts.length; i++) {
            require(bytes(questionTexts[i]).length > 0, "Question text cannot be empty");
            require(questionOptions[i].length > 0, "Question must have at least one option");
            
            survey.questions[i] = Question({
                text: questionTexts[i],
                qType: questionTypes[i],
                optionCount: questionOptions[i].length,
                options: questionOptions[i]
            });
        }

        // Initialize encrypted accumulators
        survey.totalResponses = FHE.asEuint32(0);
        FHE.allowThis(survey.totalResponses);

        // Default permissions: grant full permissions to the creator
        Permission storage creatorPerm = permissions[surveyId][msg.sender];
        creatorPerm.canView = true;
        creatorPerm.canExport = true;
        creatorPerm.canManage = true;
        creatorPerm.exists = true;

        // Allow creator to decrypt the current handle
        FHE.allow(survey.totalResponses, msg.sender);

        // Aggregated option counts will be lazily initialized on first response
        // No need to pre-initialize euint32 handles here

        emit SurveyCreated(surveyId, msg.sender, title, category, questionTexts.length);
        return surveyId;
    }

    /// @notice Submit encrypted survey response
    /// @param surveyId The survey ID
    /// @param encryptedAnswers Encrypted answers for each question
    /// @param answerProofs Proofs for the encrypted answers
    /// @dev For single choice: answer is option index (0-based)
    /// @dev For multiple choice: answer is bitmask where each bit represents an option
    /// @dev For rating: answer is rating value (1-5)
    function submitResponse(
        uint256 surveyId,
        externalEuint32[] calldata encryptedAnswers,
        bytes[] calldata answerProofs
    ) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(survey.isActive, "Survey is not active");
        require(block.timestamp >= survey.startTime && block.timestamp <= survey.endTime, "Survey period invalid");
        require(encryptedAnswers.length == survey.questionCount, "Answers length mismatch");
        require(answerProofs.length == survey.questionCount, "Proofs length mismatch");
        require(!responses[surveyId][msg.sender].exists, "Response already submitted");

        Response storage response = responses[surveyId][msg.sender];
        response.exists = true;
        response.submittedAt = block.timestamp;

        // Process each question's answer
        for (uint256 q = 0; q < survey.questionCount; q++) {
            euint32 encryptedAnswer = FHE.fromExternal(encryptedAnswers[q], answerProofs[q]);
            response.encryptedAnswers[q] = encryptedAnswer;
            FHE.allowThis(encryptedAnswer);

            Question storage question = survey.questions[q];

            if (question.qType == QuestionType.SingleChoice) {
                // Increment exactly one option based on encrypted equality
                for (uint256 o = 0; o < question.optionCount; o++) {
                    // inc = (encryptedAnswer == o) ? 1 : 0
                    euint32 inc = FHE.select(
                        FHE.eq(encryptedAnswer, FHE.asEuint32(uint32(o))),
                        FHE.asEuint32(1),
                        FHE.asEuint32(0)
                    );
                    // aggregatedCounts[q][o] += inc
                    survey.aggregatedCounts[q][o] = FHE.add(survey.aggregatedCounts[q][o], inc);
                    FHE.allowThis(survey.aggregatedCounts[q][o]);
                    // Ensure creator can decrypt updated handle
                    FHE.allow(survey.aggregatedCounts[q][o], survey.creator);
                }
            } else if (question.qType == QuestionType.MultipleChoice) {
                // Each bit in encryptedAnswer corresponds to an option
                for (uint256 o = 0; o < question.optionCount; o++) {
                    // masked = encryptedAnswer & (1 << o)
                    euint32 masked = FHE.and(encryptedAnswer, FHE.asEuint32(uint32(1) << uint32(o)));
                    // inc = (masked > 0) ? 1 : 0
                    euint32 inc = FHE.select(
                        FHE.gt(masked, FHE.asEuint32(0)),
                        FHE.asEuint32(1),
                        FHE.asEuint32(0)
                    );
                    // aggregatedCounts[q][o] += inc
                    survey.aggregatedCounts[q][o] = FHE.add(survey.aggregatedCounts[q][o], inc);
                    FHE.allowThis(survey.aggregatedCounts[q][o]);
                    FHE.allow(survey.aggregatedCounts[q][o], survey.creator);
                }
            } else if (question.qType == QuestionType.Rating) {
                // Map rating 1..5 into buckets [0..4]
                for (uint32 r = 1; r <= 5; r++) {
                    euint32 inc = FHE.select(
                        FHE.eq(encryptedAnswer, FHE.asEuint32(r)),
                        FHE.asEuint32(1),
                        FHE.asEuint32(0)
                    );
                    uint256 bucket = uint256(r - 1);
                    survey.aggregatedCounts[q][bucket] = FHE.add(survey.aggregatedCounts[q][bucket], inc);
                    FHE.allowThis(survey.aggregatedCounts[q][bucket]);
                    FHE.allow(survey.aggregatedCounts[q][bucket], survey.creator);
                }
            }
        }

        // Increment total responses
        survey.totalResponses = FHE.add(survey.totalResponses, FHE.asEuint32(1));
        FHE.allowThis(survey.totalResponses);
        // Ensure creator can always decrypt the latest handle
        FHE.allow(survey.totalResponses, survey.creator);

        emit ResponseSubmitted(surveyId, msg.sender);
    }

    /// @notice Grant permission to a user
    /// @param surveyId The survey ID
    /// @param viewer The address to grant permission to
    /// @param canView Can view results
    /// @param canExport Can export results
    /// @param canManage Can manage survey
    function grantPermission(
        uint256 surveyId,
        address viewer,
        bool canView,
        bool canExport,
        bool canManage
    ) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(msg.sender == survey.creator, "Only creator can grant permissions");

        Permission storage perm = permissions[surveyId][viewer];
        perm.canView = canView;
        perm.canExport = canExport;
        perm.canManage = canManage;
        perm.exists = true;

        // Allow the viewer to decrypt the current totalResponses handle immediately
        FHE.allow(survey.totalResponses, viewer);

        emit PermissionGranted(surveyId, viewer, msg.sender);
    }

    /// @notice Revoke permission from a user
    /// @param surveyId The survey ID
    /// @param viewer The address to revoke permission from
    function revokePermission(
        uint256 surveyId,
        address viewer
    ) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(msg.sender == survey.creator, "Only creator can revoke permissions");

        Permission storage perm = permissions[surveyId][viewer];
        perm.canView = false;
        perm.canExport = false;
        perm.canManage = false;

        emit PermissionRevoked(surveyId, viewer, msg.sender);
    }

    /// @notice Change survey active status
    /// @param surveyId The survey ID
    /// @param isActive New active status
    function setSurveyStatus(
        uint256 surveyId,
        bool isActive
    ) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(
            msg.sender == survey.creator || 
            (permissions[surveyId][msg.sender].exists && permissions[surveyId][msg.sender].canManage),
            "Not authorized"
        );

        survey.isActive = isActive;
        emit SurveyStatusChanged(surveyId, isActive);
    }

    /// @notice Get survey information
    /// @param surveyId The survey ID
    /// @return creator The creator address
    /// @return title Survey title
    /// @return category Survey category
    /// @return createdAt Creation timestamp
    /// @return startTime Start timestamp
    /// @return endTime End timestamp
    /// @return questionCount Number of questions
    /// @return exists Whether the survey exists
    /// @return isActive Whether the survey is active
    function getSurveyInfo(uint256 surveyId) external view returns (
        address creator,
        string memory title,
        string memory category,
        uint256 createdAt,
        uint256 startTime,
        uint256 endTime,
        uint256 questionCount,
        bool exists,
        bool isActive
    ) {
        Survey storage survey = surveys[surveyId];
        return (
            survey.creator,
            survey.title,
            survey.category,
            survey.createdAt,
            survey.startTime,
            survey.endTime,
            survey.questionCount,
            survey.exists,
            survey.isActive
        );
    }

    /// @notice Get question information
    /// @param surveyId The survey ID
    /// @param questionIndex The question index
    /// @return text Question text
    /// @return qType Question type
    /// @return optionCount Number of options
    /// @return options Array of option texts
    function getQuestionInfo(
        uint256 surveyId,
        uint256 questionIndex
    ) external view returns (
        string memory text,
        QuestionType qType,
        uint256 optionCount,
        string[] memory options
    ) {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(questionIndex < survey.questionCount, "Invalid question index");

        Question storage question = survey.questions[questionIndex];
        return (
            question.text,
            question.qType,
            question.optionCount,
            question.options
        );
    }

    /// @notice Get encrypted total responses count
    /// @param surveyId The survey ID
    /// @return The encrypted total number of responses
    function getTotalResponses(uint256 surveyId) external view returns (euint32) {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        return survey.totalResponses;
    }

    /// @notice Get encrypted response for a user
    /// @param surveyId The survey ID
    /// @param userAddress The user address
    /// @param questionIndex The question index
    /// @return The encrypted answer
    function getResponse(
        uint256 surveyId,
        address userAddress,
        uint256 questionIndex
    ) external view returns (euint32) {
        Response storage response = responses[surveyId][userAddress];
        require(response.exists, "Response does not exist");
        require(questionIndex < surveys[surveyId].questionCount, "Invalid question index");
        return response.encryptedAnswers[questionIndex];
    }

    /// @notice Get aggregated encrypted counts for a question
    /// @dev For SingleChoice/MultipleChoice returns optionCount entries; for Rating returns 5 buckets (1..5)
    /// @param surveyId The survey ID
    /// @param questionIndex The question index
    /// @return counts Encrypted counts array
    function getQuestionOptionCounts(
        uint256 surveyId,
        uint256 questionIndex
    ) external view returns (euint32[] memory counts) {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        require(questionIndex < survey.questionCount, "Invalid question index");

        Question storage question = survey.questions[questionIndex];
        uint256 len = question.qType == QuestionType.Rating ? 5 : question.optionCount;
        counts = new euint32[](len);
        for (uint256 o = 0; o < len; o++) {
            counts[o] = survey.aggregatedCounts[questionIndex][o];
        }
        return counts;
    }

    /// @notice Check if a user has submitted a response
    /// @param surveyId The survey ID
    /// @param userAddress The user address
    /// @return Whether the user has submitted a response
    function hasResponded(uint256 surveyId, address userAddress) external view returns (bool) {
        return responses[surveyId][userAddress].exists;
    }

    /// @notice Check if a user has permission
    /// @param surveyId The survey ID
    /// @param userAddress The user address
    /// @return canView Can view results
    /// @return canExport Can export results
    /// @return canManage Can manage survey
    function getPermission(
        uint256 surveyId,
        address userAddress
    ) external view returns (bool canView, bool canExport, bool canManage) {
        Permission storage perm = permissions[surveyId][userAddress];
        return (perm.canView, perm.canExport, perm.canManage);
    }

    /// @notice Authorize the caller to decrypt the current total responses handle (requires view permission)
    /// @param surveyId The survey ID
    function authorizeMyDecryption(uint256 surveyId) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");

        if (msg.sender != survey.creator) {
            Permission storage perm = permissions[surveyId][msg.sender];
            require(perm.exists && perm.canView, "Not authorized to view");
        }

        // Grant ACL for current ciphertext handle to the caller
        FHE.allow(survey.totalResponses, msg.sender);
    }

    /// @notice Authorize the caller to decrypt all current aggregated result handles (requires view permission)
    /// @param surveyId The survey ID
    function authorizeAllResultsDecryption(uint256 surveyId) external {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");

        if (msg.sender != survey.creator) {
            Permission storage perm = permissions[surveyId][msg.sender];
            require(perm.exists && perm.canView, "Not authorized to view");
        }

        // Allow total responses
        FHE.allow(survey.totalResponses, msg.sender);

        // Allow all question aggregated counts
        for (uint256 q = 0; q < survey.questionCount; q++) {
            Question storage question = survey.questions[q];
            uint256 len = question.qType == QuestionType.Rating ? 5 : question.optionCount;
            for (uint256 o = 0; o < len; o++) {
                FHE.allow(survey.aggregatedCounts[q][o], msg.sender);
            }
        }
    }

    /// @notice Get survey tags
    /// @param surveyId The survey ID
    /// @return Array of tags
    function getSurveyTags(uint256 surveyId) external view returns (string[] memory) {
        Survey storage survey = surveys[surveyId];
        require(survey.exists, "Survey does not exist");
        return survey.tags;
    }
}

