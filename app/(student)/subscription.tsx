// app/(student)/subscription.tsx - UPDATED WITH REAL-TIME SUBSCRIPTION DETECTION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Crown, ChevronLeft, Zap, CreditCard } from 'lucide-react-native';
import { fetchSubscriptionPlans, fetchUserSubscription } from '../../lib/api';
import { SubscriptionPlan, UserSubscription } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';

export default function SubscriptionScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { alertConfig, showAlert, Alert } = useCustomAlert();

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription listener
    const setupRealtimeListener = () => {
      if (!user?.id) return;

      console.log('Setting up realtime listener for user:', user.id);

      const channel = supabase
        .channel(`subscription-changes-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Subscription page: Change detected:', payload);
            // Reload subscription data immediately
            loadData();
          }
        )
        .subscribe((status) => {
          console.log('Subscription channel status:', status);
        });

      return () => {
        console.log('Cleaning up subscription channel');
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeListener();

    // Also poll every 3 seconds as fallback
    const pollInterval = setInterval(() => {
      console.log('Polling for subscription updates...');
      loadData();
    }, 30000);

    return () => {
      cleanup?.();
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  const loadData = async () => {
    console.log('Loading subscription data...');
    try {
      const plansData = await fetchSubscriptionPlans();
      setPlans(plansData);

      if (user?.id) {
        // Get the most recent active subscription directly
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', user.id)
          .eq('active', true)
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          console.log('Found active subscription:', {
            id: data.id,
            planName: (data as any).subscription_plans?.name,
            endDate: data.end_date,
            active: data.active,
          });
          setCurrentSubscription(data);
        } else {
          console.log('No active subscription found', { error: error?.message });
          setCurrentSubscription(null);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setCurrentSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePaymentMethodSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const initiatePayment = (plan: SubscriptionPlan, method: 'jazzcash' | 'easypaisa') => {
    setProcessingPlanId(plan.id);
    
    router.push({
      pathname: method === 'jazzcash' ? '/(student)/jazzcash-payment' : '/(student)/easypaisa-payment',
      params: {
        planId: plan.id,
        amount: plan.price,
        planName: plan.name,
        months: plan.duration_months,
      },
    });
    
    setProcessingPlanId(null);
  };

  const initiateManualPayment = (plan: SubscriptionPlan) => {
    setProcessingPlanId(plan.id);
    
    router.push({
      pathname: '/(student)/manual-payment',
      params: {
        planId: plan.id,
        amount: plan.price,
        planName: plan.name,
        months: plan.duration_months,
      },
    });
    
    setProcessingPlanId(null);
  };

  const activateTestSubscription = async () => {
    if (!user?.id) return;
    
    setProcessingPlanId('test');

    try {
      const monthlyPlan = plans.find(p => p.name.toLowerCase() === 'monthly') || plans[0];
      
      if (!monthlyPlan) {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'No subscription plans available',
        });
        return;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthlyPlan.duration_months);

      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: user.id,
        plan_id: monthlyPlan.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        active: true,
        payment_method: 'test',
        payment_provider: 'test',
        payment_status: 'completed',
        transaction_id: `TEST_${Date.now()}`,
      });

      if (error) throw error;
      
      // Data will auto-reload via realtime listener
      showAlert({
        type: 'success',
        title: 'Activated! 🎉',
        message: `${monthlyPlan.name} subscription activated for testing.`,
      });
    } catch (error: any) {
      console.error('Activation error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to activate subscription',
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getPlanBadge = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'monthly':
        return { color: '#3b82f6', label: 'POPULAR' };
      case 'semester':
        return { color: '#8b5cf6', label: 'BEST VALUE' };
      case 'yearly':
        return { color: '#f59e0b', label: 'SAVE 50%' };
      default:
        return null;
    }
  };

  const PaymentMethodModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={paymentModalStyles.overlay}>
        <View style={paymentModalStyles.container}>
          <Text style={paymentModalStyles.title}>Select Payment Method</Text>
          <Text style={paymentModalStyles.subtitle}>Choose your preferred payment method</Text>

          <View style={paymentModalStyles.buttonGrid}>
            <TouchableOpacity
              style={paymentModalStyles.methodButton}
              onPress={() => {
                setShowPaymentModal(false);
                if (selectedPlan) initiatePayment(selectedPlan, 'jazzcash');
              }}
            >
              <Text style={paymentModalStyles.methodButtonText}>JazzCash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={paymentModalStyles.methodButton}
              onPress={() => {
                setShowPaymentModal(false);
                if (selectedPlan) initiatePayment(selectedPlan, 'easypaisa');
              }}
            >
              <Text style={paymentModalStyles.methodButtonText}>EasyPaisa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={paymentModalStyles.methodButton}
              onPress={() => {
                setShowPaymentModal(false);
                if (selectedPlan) initiateManualPayment(selectedPlan);
              }}
            >
              <Text style={paymentModalStyles.methodButtonText}>Manual Transfer</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={paymentModalStyles.cancelButton}
            onPress={() => setShowPaymentModal(false)}
          >
            <Text style={paymentModalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Alert />
      <PaymentMethodModal />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c084fc"
            colors={['#c084fc']}
          />
        }
      >
        {!currentSubscription && (
          <View style={styles.testSection}>
            <View style={styles.testBanner}>
              <Zap color="#fbbf24" size={24} />
              <Text style={styles.testTitle}>Testing Mode</Text>
            </View>
            <TouchableOpacity
              style={styles.dummyButton}
              onPress={activateTestSubscription}
              disabled={processingPlanId === 'test'}
            >
              {processingPlanId === 'test' ? (
                <ActivityIndicator color="#1e1b4b" />
              ) : (
                <Text style={styles.dummyButtonText}>⚡ Activate Test Subscription</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.testNote}>
              For testing purposes only. Activates monthly subscription.
            </Text>
          </View>
        )}

        {currentSubscription && (
          <View style={styles.currentSubCard}>
            <View style={styles.crownIcon}>
              <Crown color="#fbbf24" size={24} fill="#fbbf24" />
            </View>
            <Text style={styles.currentSubTitle}>Active Subscription</Text>
            <Text style={styles.currentSubPlan}>
              {(currentSubscription as any).subscription_plans?.name} Plan
            </Text>
            <Text style={styles.currentSubDate}>
              Valid until {format(new Date(currentSubscription.end_date), 'MMM dd, yyyy ')} </Text>
            <Text style={styles.currentSubStatus}>
              Status: {currentSubscription.active ? '✓ Active' : '✗ Expired'}
            </Text>
          </View>
        )}

        <View style={styles.plansContainer}>
          {plans.map((plan) => {
            const badge = getPlanBadge(plan.name);
            const isCurrentPlan =
              currentSubscription &&
              (currentSubscription as any).subscription_plans?.id === plan.id;
            const isProcessing = processingPlanId === plan.id;

            return (
              <View key={plan.id} style={styles.planCard}>
                {badge && (
                  <View style={[styles.badge, { backgroundColor: badge.color }]}>
                    <Text style={styles.badgeText}>{badge.label}</Text>
                  </View>
                )}

                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDuration}>
                  {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}
                </Text>

                <View style={styles.priceContainer}>
                  <Text style={styles.currency}>₨</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.perMonth}>/month</Text>
                </View>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.feature}>
                      <Check color="#22c55e" size={20} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    isCurrentPlan && styles.selectButtonActive,
                  ]}
                  onPress={() => !isCurrentPlan && handlePaymentMethodSelect(plan)}
                  disabled={isCurrentPlan || isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#c084fc" />
                  ) : (
                    <>
                      <CreditCard color="#c084fc" size={20} style={{ marginRight: 8 }} />
                      <Text
                        style={[
                          styles.selectButtonText,
                          isCurrentPlan && styles.selectButtonTextActive,
                        ]}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Why Subscribe?</Text>
          <View style={styles.benefit}>
            <Text style={styles.benefitEmoji}>🎯</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Unlimited Access</Text>
              <Text style={styles.benefitText}>
                Redeem discounts at any vendor, anytime
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Text style={styles.benefitEmoji}>💰</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Save Big</Text>
              <Text style={styles.benefitText}>
                Get 20-30% off at 100+ locations
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Text style={styles.benefitEmoji}>⚡</Text>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Instant Redemption</Text>
              <Text style={styles.benefitText}>Just scan QR code at checkout</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Styles remain the same...
const paymentModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#c084fc',
    paddingVertical: 2,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodButtonText: {
    color: '#1e1b4b',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    marginTop: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16, marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  scrollContent: { padding: 16 },
  testSection: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 2, borderColor: '#fbbf24', borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center' },
  testBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  testTitle: { color: '#fbbf24', fontSize: 18, fontWeight: 'bold' },
  dummyButton: { backgroundColor: '#fbbf24', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  dummyButtonText: { color: '#1e1b4b', fontSize: 16, fontWeight: 'bold' },
  testNote: { color: '#fbbf24', fontSize: 12, textAlign: 'center', opacity: 0.8 },
  currentSubCard: { backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 2, borderColor: '#fbbf24', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  crownIcon: { marginBottom: 8 },
  currentSubTitle: { color: '#fbbf24', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  currentSubPlan: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  currentSubDate: { color: '#c084fc', fontSize: 14, marginBottom: 4 },
  currentSubStatus: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  plansContainer: { gap: 16 },
  planCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', position: 'relative' },
  badge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  planName: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  planDuration: { color: '#c084fc', fontSize: 14, marginBottom: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  currency: { color: '#c084fc', fontSize: 24, fontWeight: '600' },
  price: { color: 'white', fontSize: 48, fontWeight: 'bold', marginLeft: 4 },
  perMonth: { color: '#c084fc', fontSize: 16, marginLeft: 4 },
  featuresContainer: { marginBottom: 24, gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: '#c084fc', fontSize: 14, flex: 1 },
  selectButton: { backgroundColor: 'rgba(192, 132, 252, 0.2)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#c084fc', flexDirection: 'row', justifyContent: 'center', minHeight: 52 },
  selectButtonActive: { backgroundColor: 'rgba(192, 132, 252, 0.2)', borderWidth: 2, borderColor: '#c084fc' },
  selectButtonText: { color: '#c084fc', fontSize: 16, fontWeight: 'bold' },
  selectButtonTextActive: { color: '#c084fc' },
  benefitsSection: { marginTop: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  benefitsTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  benefitEmoji: { fontSize: 32, marginRight: 16 },
  benefitContent: { flex: 1 },
  benefitTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  benefitText: { color: '#c084fc', fontSize: 14, lineHeight: 20 },
});