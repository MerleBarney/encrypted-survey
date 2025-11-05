
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const EncryptedSurveyABI = {
  "abi": [
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "granter",
          "type": "address"
        }
      ],
      "name": "PermissionGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "revoker",
          "type": "address"
        }
      ],
      "name": "PermissionRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "participant",
          "type": "address"
        }
      ],
      "name": "ResponseSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "category",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "questionCount",
          "type": "uint256"
        }
      ],
      "name": "SurveyCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "name": "SurveyStatusChanged",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        }
      ],
      "name": "authorizeAllResultsDecryption",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        }
      ],
      "name": "authorizeMyDecryption",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "confidentialProtocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "category",
          "type": "string"
        },
        {
          "internalType": "string[]",
          "name": "tags",
          "type": "string[]"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "string[]",
          "name": "questionTexts",
          "type": "string[]"
        },
        {
          "internalType": "enum EncryptedSurvey.QuestionType[]",
          "name": "questionTypes",
          "type": "uint8[]"
        },
        {
          "internalType": "string[][]",
          "name": "questionOptions",
          "type": "string[][]"
        }
      ],
      "name": "createSurvey",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        }
      ],
      "name": "getPermission",
      "outputs": [
        {
          "internalType": "bool",
          "name": "canView",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canExport",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canManage",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "questionIndex",
          "type": "uint256"
        }
      ],
      "name": "getQuestionInfo",
      "outputs": [
        {
          "internalType": "string",
          "name": "text",
          "type": "string"
        },
        {
          "internalType": "enum EncryptedSurvey.QuestionType",
          "name": "qType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "optionCount",
          "type": "uint256"
        },
        {
          "internalType": "string[]",
          "name": "options",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "questionIndex",
          "type": "uint256"
        }
      ],
      "name": "getQuestionOptionCounts",
      "outputs": [
        {
          "internalType": "euint32[]",
          "name": "counts",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "questionIndex",
          "type": "uint256"
        }
      ],
      "name": "getResponse",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        }
      ],
      "name": "getSurveyInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "category",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "questionCount",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        }
      ],
      "name": "getSurveyTags",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        }
      ],
      "name": "getTotalResponses",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "canView",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canExport",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canManage",
          "type": "bool"
        }
      ],
      "name": "grantPermission",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "userAddress",
          "type": "address"
        }
      ],
      "name": "hasResponded",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "permissions",
      "outputs": [
        {
          "internalType": "bool",
          "name": "canView",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canExport",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "canManage",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "responses",
      "outputs": [
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "submittedAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "viewer",
          "type": "address"
        }
      ],
      "name": "revokePermission",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        }
      ],
      "name": "setSurveyStatus",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "surveyId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32[]",
          "name": "encryptedAnswers",
          "type": "bytes32[]"
        },
        {
          "internalType": "bytes[]",
          "name": "answerProofs",
          "type": "bytes[]"
        }
      ],
      "name": "submitResponse",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "surveyCounter",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "surveys",
      "outputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "category",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "startTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isActive",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "questionCount",
          "type": "uint256"
        },
        {
          "internalType": "euint32",
          "name": "totalResponses",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
} as const;

