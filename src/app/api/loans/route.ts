// src/app/api/loans/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "@/lib/loanStorage";

// Enhanced logging utility
const logLoan = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [LOAN-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};

// GET /api/loans - Get loans for a wallet
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logLoan("GET_LOANS_START", { requestId });

  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      const error = "Wallet address parameter is required";
      logLoan("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    logLoan("FETCHING_LOANS", { requestId, walletAddress });

    const loans = loanStorage.getWalletLoans(walletAddress);
    const creditSummary = loanStorage.getCreditSummary(walletAddress);

    const response = {
      success: true,
      loans,
      creditSummary,
      requestId,
    };

    logLoan("GET_LOANS_SUCCESS", {
      requestId,
      loansCount: loans.length,
      creditSummary,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    logLoan(
      "GET_LOANS_ERROR",
      {
        requestId,
        error: error.message,
        stack: error.stack,
      },
      true
    );

    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch loans" },
      { status: 500 }
    );
  }
}

// POST /api/loans - Create a new loan (called from borrow endpoint)
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logLoan("CREATE_LOAN_START", { requestId });

  try {
    const loanData = await request.json();
    logLoan("CREATE_LOAN_DATA", { requestId, loanData });

    // Validate required fields
    const requiredFields = [
      "id",
      "preAuthId",
      "walletAddress",
      "borrowAmount",
      "asset",
    ];
    for (const field of requiredFields) {
      if (!loanData[field]) {
        const error = `Missing required field: ${field}`;
        logLoan("VALIDATION_ERROR", { requestId, error }, true);
        return NextResponse.json({ success: false, error }, { status: 400 });
      }
    }

    // Add timestamps
    loanData.createdAt = new Date().toISOString();
    loanData.status = "active";

    // Store the loan
    loanStorage.createLoan(loanData);

    const response = {
      success: true,
      loan: loanData,
      requestId,
    };

    logLoan("CREATE_LOAN_SUCCESS", { requestId, loanId: loanData.id });
    return NextResponse.json(response);
  } catch (error: any) {
    logLoan(
      "CREATE_LOAN_ERROR",
      {
        requestId,
        error: error.message,
        stack: error.stack,
      },
      true
    );

    return NextResponse.json(
      { success: false, error: error.message || "Failed to create loan" },
      { status: 500 }
    );
  }
}
