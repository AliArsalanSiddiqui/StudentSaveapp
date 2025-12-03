import React, { useRef, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createJazzCashPayment, JAZZCASH_PAYMENT_URL } from '../../lib/jazzcash';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export default function JazzCashPayment() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);

  const planId = params.planId as string;
  const amount = parseInt(params.amount as string);

  const paymentData = createJazzCashPayment({
    amount,
    orderId: `ORDER_${Date.now()}`,
    description: 'StudentSave Subscription',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
  });

  // Create HTML form for JazzCash
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <form id="jazzcash-form" method="POST" action="${JAZZCASH_PAYMENT_URL}">
        ${Object.entries(paymentData)
          .map(
            ([key, value]) =>
              `<input type="hidden" name="${key}" value="${value}" />`
          )
          .join('')}
      </form>
      <script>
        document.getElementById('jazzcash-form').submit();
      </script>
    </body>
    </html>
  `;

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // Check if returned from JazzCash
    if (url.includes('studentsave://payment/return')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const responseCode = urlParams.get('pp_ResponseCode');

      if (responseCode === '000') {
        // Payment successful
        handlePaymentSuccess(urlParams.get('pp_TxnRefNo') || '');
      } else {
        Alert.alert('Payment Failed', 'Please try again');
        router.back();
      }
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      await supabase.from('user_subscriptions').insert({
        user_id: user?.id,
        plan_id: planId,
        start_date: new Date().toISOString(),
        end_date: getEndDate(),
        active: true,
        payment_method: 'jazzcash',
        transaction_id: transactionId,
      });

      Alert.alert('Success', 'Subscription activated!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(student)'),
        },
      ]);
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', 'Failed to activate subscription');
    }
  };

  const getEndDate = () => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return end.toISOString();
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onNavigationStateChange={handleNavigationStateChange}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  webview: {
    flex: 1,
  },
});