export interface PreAuthData {
  [x: string]: string | number | undefined;
  available_credit: number;
  card_last_four: string;
  card_brand: string;
  status: "active" | "pending" | "failed";
  wallet_address?: string;
  created_at?: string;
}

export interface BorrowingData {
  amount: number;
  asset: string;
  ltv_ratio: number;
  interest_rate: number;
  wallet_address: string;
}
