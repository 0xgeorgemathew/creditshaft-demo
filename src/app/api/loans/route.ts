// src/app/api/loans/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "@/lib/loanStorage";


// GET /api/loans - Get loans for a wallet
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);

  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      const error = "Wallet address parameter is required";
      return NextResponse.json({ success: false, error }, { status: 400 });
    }


    const loans = loanStorage.getWalletLoans(walletAddress);
    const creditSummary = loanStorage.getCreditSummary(walletAddress);

    const response = {
      success: true,
      loans,
      creditSummary,
      requestId,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch loans" },
      { status: 500 }
    );
  }
}

// POST /api/loans - Create a new loan (called from borrow endpoint)
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);

  try {
    const loanData = await request.json();

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

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create loan" },
      { status: 500 }
    );
  }
}
