// frontend/src/lib/categoryMetadata.js
import {
  ShoppingCart, Car, Home, Clapperboard, Utensils, HeartPulse, HelpCircle, CircleDollarSign,
  HeartPlus,
  Lightbulb,
  Shirt
} from 'lucide-react';

// Define metadata for each category, now including hex color
export const categoryMetadata = {
  'Groceries': {
    icon: ShoppingCart,
    color: 'text-green-600',
    colorHex: '#16A34A', // Example hex for green-600
  },
  'Transport': {
    icon: Car,
    color: 'text-blue-600',
    colorHex: '#2563EB', // Example hex for blue-600
  },
  'Utilities': {
    icon: Lightbulb,
    color: 'text-yellow-600',
    colorHex: '#CA8A04', // Example hex for yellow-600
  },
  'Healthcare': {
    icon: HeartPlus,
    color: 'text-orange-600',
    colorHex: '#EA580C', // Example hex for orange-600
  },
  'Entertainment': {
    icon: Clapperboard,
    color: 'text-purple-600',
    colorHex: '#9333EA', // Example hex for purple-600
  },
  'Dining Out': {
    icon: Utensils,
    color: 'text-red-600',
    colorHex: '#DC2626', // Example hex for red-600
  },
  'Shopping': {
    icon: Shirt,
    color: 'text-cyan-600',
    colorHex: '#00ACC1', // Example hex for pink-600
  },
  'Rent': {
    icon: Home,
    color: 'text-indigo-600',
    colorHex: '#4F46E5', // Example hex for indigo-600
  },
  'Uncategorized': {
    icon: HelpCircle,
    color: 'text-gray-500',
    colorHex: '#6B7280', // Example hex for gray-500
  },
  '_default': {
    icon: CircleDollarSign,
    color: 'text-gray-500',
    colorHex: '#6B7280', // Default hex color
  }
};

// Helper function remains the same
export function getCategoryMetadata(categoryName) {
  // Use hasOwnProperty for safer lookup, especially if categoryName could be something like 'toString'
  return Object.prototype.hasOwnProperty.call(categoryMetadata, categoryName)
    ? categoryMetadata[categoryName]
    : categoryMetadata['_default'];
}

// REMOVED CHART_COLORS array and getChartColor function