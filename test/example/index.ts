import BigNumber from "bignumber.js";
import Web3 from "web3";

const contractAbi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "targetTokenAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "idexRouterAddres",
        type: "address",
      },
    ],
    name: "honeyCheck",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "buyResult",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tokenBalance2",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "sellResult",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "buyCost",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "sellCost",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "expectedAmount",
            type: "uint256",
          },
        ],
        internalType: "struct honeyCheckerV5.HoneyResponse",
        name: "response",
        type: "tuple",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "router",
    outputs: [
      {
        internalType: "contract IDEXRouter",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const TEST_AMOUNT = 10 ** 17 * 5; // Equal with 0.5 wETH, 2 wBNB, 2 wCRO...
const GAS_LIMIT = "4500000"; // 4.5 million Gas should be enough

const RunHoneyContract = async (
  from: string,
  honeyCheckerAddress: string,
  token: string,
  router: string,
  rcpAddress: string
) => {
  let buyTax = 0;
  let sellTax = 0;
  let buyGasCost = 0;
  let sellGasCost = 0;
  let isHoneypot = 0;

  const web3 = new Web3(rcpAddress);
  const gasPrice = await web3.eth.getGasPrice();

  const honeyCheck = new web3.eth.Contract(contractAbi as any);

  const data = honeyCheck.methods.honeyCheck(token, router).encodeABI();

  let honeyTxResult: any;

  try {
    honeyTxResult = await web3.eth.call({
      // this could be provider.addresses[0] if it exists
      from,
      // target address, this could be a smart contract address
      to: honeyCheckerAddress,
      // optional if you want to specify the gas limit
      gas: GAS_LIMIT,
      gasPrice: Math.floor(Number(gasPrice) * 1.2).toString(),
      // optional if you are invoking say a payable function
      value: TEST_AMOUNT,
      // nonce
      nonce: undefined,
      // this encodes the ABI of the method and the arguements
      data,
    });
  } catch (error) {
    return {
      buyTax: -1,
      sellTax: -1,
      isHoneypot: 1,
      error: error,
    };
  }

  const decoded = web3.eth.abi.decodeParameter(
    "tuple(uint256,uint256,uint256,uint256,uint256,uint256)",
    honeyTxResult
  );

  buyGasCost = decoded[3];
  sellGasCost = decoded[4];

  const res = {
    buyResult: decoded[0],
    leftOver: decoded[1],
    sellResult: decoded[2],
    expectedAmount: decoded[5],
  };

  buyTax =
    (1 -
      new BigNumber(res.buyResult)
        .dividedBy(new BigNumber(res.expectedAmount))
        .toNumber()) *
    100;
  sellTax =
    (1 -
      new BigNumber(res.sellResult)
        .dividedBy(new BigNumber(TEST_AMOUNT))
        .toNumber()) *
      100 -
    buyTax;

  return {
    buyTax,
    sellTax,
    buyGasCost,
    sellGasCost,
    isHoneypot,
  };
};

/**
  from: string,
  honeyCheckAddress: string,
  token: string,
  router: string,
  rcpAddress: string
 */

//BSC
RunHoneyContract(
  "0xB58Da08f3e43E6AD1fB7cE40c6f687AD6cf6f764",
  "0xbDEFceA404E588603b86dDEC84471834d14E303F",
  "0x64F873A5b1c7bd024F7293f77133fDAdEFf6C822",
  "0x4f381d5fF61ad1D0eC355fEd2Ac4000eA1e67854",
  "https://www.oklink.com/en/ethw/"
)
  .catch()
  .then((e) => console.log("BSC MainNet", e));
