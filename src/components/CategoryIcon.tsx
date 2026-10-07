import React from 'react';
import {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Users,
  Briefcase,
  Laptop,
  Award,
  TrendingUp,
  Store,
  Gift,
  PlusCircle,
  MoreHorizontal,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  HelpCircle,
  type LucideProps
} from 'lucide-react';

const iconMap: Record<string, React.FC<LucideProps>> = {
  Utensils,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Users,
  Briefcase,
  Laptop,
  Award,
  TrendingUp,
  Store,
  Gift,
  PlusCircle,
  MoreHorizontal,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
};

interface Props extends LucideProps {
  name: string;
}

export const CategoryIcon: React.FC<Props> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent {...props} />;
};
