import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format currency in PKR
 */
export const formatCurrency = (amount: number): string => {
  return `₨${amount.toLocaleString('en-PK')}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM dd, yyyy');
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'MMM dd, yyyy h:mm a');
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate university email
 */
export const validateUniversityEmail = (email: string): boolean => {
  return (
    email.endsWith('.edu') ||
    email.includes('university') ||
    email.includes('college')
  );
};

/**
 * Validate phone number (Pakistan format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+92|0)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Calculate discount amount
 */
export const calculateDiscount = (
  originalPrice: number,
  discountPercentage: number
): number => {
  return Math.round((originalPrice * discountPercentage) / 100);
};

/**
 * Calculate final price after discount
 */
export const calculateFinalPrice = (
  originalPrice: number,
  discountPercentage: number
): number => {
  return originalPrice - calculateDiscount(originalPrice, discountPercentage);
};

/**
 * Check if subscription is active
 */
export const isSubscriptionActive = (endDate: string): boolean => {
  return new Date(endDate) > new Date();
};

/**
 * Get days remaining in subscription
 */
export const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +92 300 1234567
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `+92 ${cleaned.substring(1, 4)} ${cleaned.substring(4)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('92')) {
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
  }
  
  return phone;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Check if string is empty or whitespace
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  return !str || str.trim().length === 0;
};

/**
 * Sleep function for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get vendor category emoji
 */
export const getCategoryEmoji = (category: string): string => {
  const emojiMap: { [key: string]: string } = {
    Restaurant: '🍽️',
    Cafe: '☕',
    Arcade: '🎮',
    Clothing: '👕',
    Entertainment: '🎬',
  };
  return emojiMap[category] || '🏪';
};

/**
 * Get discount badge color
 */
export const getDiscountBadgeColor = (percentage: number): string => {
  if (percentage >= 30) return '#22c55e';
  if (percentage >= 20) return '#3b82f6';
  if (percentage >= 10) return '#f59e0b';
  return '#94a3b8';
};

/**
 * Validate form data
 */
export const validateProfileData = (data: {
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (data.name && data.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.phone && !validatePhoneNumber(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.age && (data.age < 16 || data.age > 100)) {
    errors.push('Age must be between 16 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Handle API errors
 */
export const handleApiError = (error: any): string => {
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Calculate subscription savings
 */
export const calculateSubscriptionSavings = (
  monthlyPrice: number,
  planPrice: number,
  months: number
): number => {
  const totalMonthlyPrice = monthlyPrice * months;
  return totalMonthlyPrice - planPrice;
};

/**
 * Get subscription period text
 */
export const getSubscriptionPeriodText = (months: number): string => {
  if (months === 1) return '1 month';
  if (months === 6) return '6 months';
  if (months === 12) return '1 year';
  return `${months} months`;
};
/**
 * Validate Pakistani university email
 */
export const validatePakistaniUniversityEmail = (email: string): {
  isValid: boolean;
  error?: string;
} => {
  const lowerEmail = email.toLowerCase().trim();
  
  // Must end with .edu.pk
  if (!lowerEmail.endsWith('.edu.pk')) {
    return {
      isValid: false,
      error: 'Email must end with .edu.pk',
    };
  }
  
  // Must have @ symbol
  if (!lowerEmail.includes('@')) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }
  
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.edu\.pk$/;
  if (!emailRegex.test(lowerEmail)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }
  
  return { isValid: true };
};