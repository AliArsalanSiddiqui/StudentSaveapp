import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export default function PaymentScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);

  const planId = params.planId as string;
  const amount = parseInt(params.amount as string);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // 1. Create payment intent on your backend
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: amount * 100, // Convert to cents
          currency: 'pkr',
          planId,
          userId: user?.id,
        },
      });

      if (error) throw error;

      // 2. Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'StudentSave',
        paymentIntentClientSecret: data.clientSecret,
        defaultBillingDetails: {
          email: user?.email,
          name: user?.name,
        },
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setLoading(false);
        return;
      }

      // 3. Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Alert.alert('Payment Failed', presentError.message);
        setLoading(false);
        return;
      }

      // 4. Payment successful - create subscription
      await createSubscription(data.paymentIntentId);

      Alert.alert('Success', 'Subscription activated!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(student)'),
        },
      ]);
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (transactionId: string) => {
    await supabase.from('user_subscriptions').insert({
      user_id: user?.id,
      plan_id: planId,
      start_date: new Date().toISOString(),
      end_date: getEndDate(),
      active: true,
      payment_method: 'stripe',
      transaction_id: transactionId,
    });
  };

  const getEndDate = () => {
    const end = new Date();
    // Add months based on plan
    end.setMonth(end.getMonth() + 1);
    return end.toISOString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Payment</Text>
      <Text style={styles.amount}>₨{amount}</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handlePayment}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Processing...' : 'Pay Now'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  amount: {
    color: '#c084fc',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#c084fc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: '600',
  },
});