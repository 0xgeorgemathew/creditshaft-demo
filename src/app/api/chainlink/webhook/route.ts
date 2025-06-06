// src/app/api/chainlink/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "../../../../lib/loanStorage";
import { createLogger } from "../../../../lib/logger";
import type { BlockchainLoan } from "../../../../types";

const logFunction = createLogger("CHAINLINK-WEBHOOK");

/**
 * Webhook endpoint for receiving smart contract events
 * Updates off-chain loan data when Chainlink automation triggers
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    logFunction("Chainlink webhook received", event);
    
    const { eventType, loanId, data } = event;
    
    const loan = loanStorage.getLoan(loanId);
    
    if (!loan) {
      logFunction("Loan not found for webhook", { loanId }, true);
      return NextResponse.json({ 
        success: false, 
        error: "Loan not found" 
      }, { status: 404 });
    }
    
    // Cast to BlockchainLoan to access Chainlink fields
    const blockchainLoan = loan as BlockchainLoan;
    
    // Initialize automation status if not present
    if (!blockchainLoan.automationStatus) {
      blockchainLoan.automationStatus = 'pending';
    }
    
    // Update loan based on smart contract events
    switch (eventType) {
      case 'AutomationScheduled':
        blockchainLoan.automationStatus = 'scheduled';
        blockchainLoan.nextAutomationCheck = new Date(data.triggerTime * 1000).toISOString();
        logFunction("Automation scheduled", { loanId, triggerTime: data.triggerTime });
        break;
        
      case 'AutoChargeExecuted':
        if (data.success) {
          blockchainLoan.status = 'charged';
          blockchainLoan.chargedAt = new Date().toISOString();
          blockchainLoan.actualChargedAmount = data.chargedAmount / 100; // Convert from cents
          blockchainLoan.stripeChargeId = data.stripeChargeId;
          blockchainLoan.automationStatus = 'triggered';
          logFunction("Auto-charge successful", { 
            loanId, 
            chargedAmount: blockchainLoan.actualChargedAmount,
            stripeChargeId: blockchainLoan.stripeChargeId 
          });
        } else {
          blockchainLoan.automationStatus = 'failed';
          logFunction("Auto-charge failed", { loanId, error: data.error }, true);
        }
        break;
        
      case 'LoanReleased':
        blockchainLoan.status = 'released';
        blockchainLoan.releasedAt = new Date().toISOString();
        blockchainLoan.automationStatus = 'cancelled';
        logFunction("Loan released", { loanId });
        break;
        
      case 'LoanLiquidated':
        blockchainLoan.status = 'charged';
        blockchainLoan.chargedAt = new Date().toISOString();
        blockchainLoan.automationStatus = 'triggered';
        logFunction("Loan liquidated", { loanId, amount: data.amount });
        break;
        
      default:
        logFunction("Unknown event type", { eventType, loanId }, true);
        return NextResponse.json({ 
          success: false, 
          error: "Unknown event type" 
        }, { status: 400 });
    }
    
    // Update the loan in storage with the modified fields
    const updateSuccess = loanStorage.updateLoan(blockchainLoan.id, {
      status: blockchainLoan.status,
      automationStatus: blockchainLoan.automationStatus,
      nextAutomationCheck: blockchainLoan.nextAutomationCheck,
      chargedAt: blockchainLoan.chargedAt,
      releasedAt: blockchainLoan.releasedAt,
      actualChargedAmount: blockchainLoan.actualChargedAmount,
      stripeChargeId: blockchainLoan.stripeChargeId,
    } as Partial<BlockchainLoan>);
    
    if (!updateSuccess) {
      logFunction("Failed to update loan in storage", { loanId }, true);
      return NextResponse.json({
        success: false,
        error: "Failed to update loan"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      loanId,
      updatedStatus: blockchainLoan.status,
      automationStatus: blockchainLoan.automationStatus
    });
    
  } catch (error) {
    logFunction("Webhook processing failed", error, true);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "chainlink-webhook"
  });
}