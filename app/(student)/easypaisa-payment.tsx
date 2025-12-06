import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createEasypaisaPayment, EASYPAISA_PAYMENT_URL } from '../../lib/easypaisa';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';

export default function EasypaisaPayment() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const { alertConfig, showAlert, Alert } = useCustomAlert();

  const planId = params.planId as string;
  const amount = parseInt(params.amount as string);
  const planName = params.planName as string;
  const months = parseInt(params.months as string);

  const paymentData = createEasypaisaPayment({
    amount,
    orderId: `ORDER_${Date.now()}`,
    description: `StudentSave ${planName} Subscription`,
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          min-height: 100vh; 
          background: #1e1b4b;
          margin: 0;
          font-family: system-ui;
        }
        .loader {
          color: #c084fc;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="loader">Connecting to EasyPaisa...</div>
      <form id="easypaisa-form" method="POST" action="${EASYPAISA_PAYMENT_URL}">
        ${Object.entries(paymentData)
          .map(
            ([key, value]) =>
              `<input type="hidden" name="${key}" value="${value}" />`
          )
          .join('')}
      </form>
      <script>
        setTimeout(() => {
          document.getElementById('easypaisa-form').submit();
        }, 1000);
      </script>
    </body>
    </html>
  `;

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    setLoading(navState.loading);

    if (url.includes('studentsave://payment/return') || url.includes('payment/return')) {
      try {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const status = urlParams.get('status');
        const txnRefNo = urlParams.get('orderRefNum') || `EP_${Date.now()}`;

        if (status === '0000') {
          await handlePaymentSuccess(txnRefNo);
        } else {
          showAlert({
            type: 'error',
            title: 'Payment Failed',
            message: 'Transaction was not successful',
            buttons: [
              {
                text: 'Try Again',
                onPress: () => router.back(),
                style: 'default',
              },
            ],
          });
        }
      } catch (error) {
        console.error('Payment processing error:', error);
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Failed to process payment response',
        });
      }
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: user?.id,
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        active: true,
        payment_method: 'mobile_wallet',
        payment_provider: 'easypaisa',
        payment_status: 'completed',
        transaction_id: transactionId,
      });

      if (error) throw error;

      showAlert({
        type: 'success',
        title: 'Success! 🎉',
        message: `Your ${planName} subscription has been activated!`,
        buttons: [
          {
            text: 'Start Using',
            onPress: () => router.replace('/(student)'),
            style: 'default',
          },
        ],
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Payment successful but failed to activate subscription',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Alert />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#c084fc" />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onNavigationStateChange={handleNavigationStateChange}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 75, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: { color: 'white', fontSize: 16, marginTop: 16 },
});