import { Bus, Film, ShoppingBag, Utensils, Zap } from 'lucide-react';
import type { CategoryId } from '../data/budgetData';

interface CategoryIconProps {
  categoryId: CategoryId;
  className?: string;
}

export function CategoryIcon({ categoryId, className = 'w-4 h-4' }: CategoryIconProps) {
  switch (categoryId) {
    case 'alimentacion':
      return <Utensils className={className} aria-hidden="true" />;
    case 'transporte':
      return <Bus className={className} aria-hidden="true" />;
    case 'servicios':
      return <Zap className={className} aria-hidden="true" />;
    case 'compras':
      return <ShoppingBag className={className} aria-hidden="true" />;
    case 'entretenimiento':
      return <Film className={className} aria-hidden="true" />;
  }
}
