import CryptoJS from "crypto-js";


const JAZZCASH_MERCHANT_ID = process.env.EXPO_PUBLIC_JAZZCASH_MERCHANT_ID!;
const JAZZCASH_PASSWORD = process.env.EXPO_PUBLIC_JAZZCASH_PASSWORD!;
const JAZZCASH_SALT = process.env.EXPO_PUBLIC_JAZZCASH_SALT!;
const JAZZCASH_RETURN_URL = 'studentsave://payment/return';

export interface JazzCashPaymentParams {
  amount: number;
  orderId: string;
  description: string;
  customerEmail: string;
  customerPhone: string;
}

export const createJazzCashPayment = (params: JazzCashPaymentParams) => {
  const {
    amount,
    orderId,
    description,
    customerEmail,
    customerPhone,
  } = params;

  const txnDateTime = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
  const expiryDateTime = new Date(Date.now() + 3600000)
    .toISOString()
    .replace(/[-:]/g, '')
    .slice(0, 14);

  const paymentData = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: JAZZCASH_MERCHANT_ID,
    pp_Password: JAZZCASH_PASSWORD,
    pp_TxnRefNo: orderId,
    pp_Amount: (amount * 100).toString(), // Convert to paisa
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: orderId,
    pp_Description: description,
    pp_TxnExpiryDateTime: expiryDateTime,
    pp_ReturnURL: JAZZCASH_RETURN_URL,
    pp_SecureHash: '',
    ppmpf_1: customerEmail,
    ppmpf_2: customerPhone,
  };

  // Generate secure hash
  const sortedString = Object.keys(paymentData)
    .filter((key) => key !== 'pp_SecureHash')
    .sort()
    .map((key) => paymentData[key as keyof typeof paymentData])
    .join('&');

  const secureHash = CryptoJS.HmacSHA256(
    JAZZCASH_SALT + '&' + sortedString,
    JAZZCASH_SALT
  ).toString(CryptoJS.enc.Hex);

  paymentData.pp_SecureHash = secureHash;

  return paymentData;
};

export const JAZZCASH_PAYMENT_URL = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';