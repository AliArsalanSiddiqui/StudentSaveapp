import CryptoJS from 'crypto-js';

const EASYPAISA_STORE_ID = process.env.EXPO_PUBLIC_EASYPAISA_STORE_ID!;
const EASYPAISA_SECRET_KEY = process.env.EXPO_PUBLIC_EASYPAISA_SECRET_KEY!;

export interface EasypaisaPaymentParams {
  amount: number;
  orderId: string;
  description: string;
}

export const createEasypaisaPayment = (params: EasypaisaPaymentParams) => {
  const { amount, orderId, description } = params;

  const paymentData = {
    storeId: EASYPAISA_STORE_ID,
    orderId,
    transactionAmount: amount.toString(),
    transactionType: 'MA',
    mobileAccountNo: '', // Will be entered by user
    emailAddress: '',
    orderRefNum: orderId,
    orderDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
  };

  // Generate hash
  const hashString = `${paymentData.storeId}${paymentData.orderId}${paymentData.transactionAmount}${paymentData.transactionType}`;
  const hash = CryptoJS.HmacSHA256(hashString, EASYPAISA_SECRET_KEY).toString();

  return {
    ...paymentData,
    hash,
  };
};

export const EASYPAISA_PAYMENT_URL = 'https://easypaisa.com.pk/easypay';